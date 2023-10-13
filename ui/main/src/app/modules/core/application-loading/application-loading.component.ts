/* Copyright (c) 2022-2023, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Component, NgZone, OnInit, Output, ViewChild} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ConfigService} from 'app/business/services/config.service';
import {EntitiesService} from 'app/business/services/users/entities.service';
import {GroupsService} from 'app/business/services/users/groups.service';
import {LoggerService as logger} from 'app/business/services/logs/logger.service';
import {ProcessesService} from 'app/business/services/businessconfig/processes.service';
import {UserService} from 'app/business/services/users/user.service';
import {Utilities} from 'app/business/common/utilities';
import {catchError, Subject} from 'rxjs';
import {ActivityAreaChoiceAfterLoginComponent} from './activityarea-choice-after-login/activityarea-choice-after-login.component';
import {AccountAlreadyUsedComponent} from './account-already-used/account-already-used.component';
import {AppLoadedInAnotherTabComponent} from './app-loaded-in-another-tab/app-loaded-in-another-tab.component';
import {SettingsService} from 'app/business/services/users/settings.service';
import {GlobalStyleService} from 'app/business/services/global-style.service';
import {OpfabEventStreamServer} from 'app/business/server/opfabEventStream.server';
import {OpfabEventStreamService} from 'app/business/services/events/opfabEventStream.service';
import {LightCardsStoreService} from 'app/business/services/lightcards/lightcards-store.service';
import {ApplicationUpdateService} from 'app/business/services/events/application-update.service';
import {ServerResponseStatus} from 'app/business/server/serverResponse';
import {CurrentUserStore} from 'app/business/store/current-user.store';
import {AuthService} from 'app/authentication/auth.service';
import {AuthenticationMode} from 'app/authentication/auth.model';
import {SystemNotificationService} from '../../../business/services/notifications/system-notification.service';
import {BusinessDataService} from 'app/business/services/businessconfig/businessdata.service';
import {Router} from '@angular/router';
import {OpfabAPIService} from 'app/business/services/opfabAPI.service';
import {loadBuildInTemplates} from 'app/business/buildInTemplates/templatesLoader';
import {RemoteLoggerServer} from 'app/business/server/remote-logger.server';
import {ConfigServer} from 'app/business/server/config.server';
import {ServicesConfig} from 'app/business/services/services-config';
import {TranslationService} from 'app/business/services/translation/translation.service';

declare const opfab: any;
@Component({
    selector: 'of-application-loading',
    styleUrls: ['./application-loading.component.scss'],
    templateUrl: './application-loading.component.html'
})
export class ApplicationLoadingComponent implements OnInit {
    @Output() applicationLoadedDone: Subject<boolean> = new Subject();

    @ViewChild('activityAreaChoiceAfterLogin')
    activityAreaChoiceAfterLoginComponent: ActivityAreaChoiceAfterLoginComponent;
    @ViewChild('accountAlreadyUsed') accountAlreadyUsedComponent: AccountAlreadyUsedComponent;
    @ViewChild('appLoadedInAnotherTab') appLoadedInAnotherTabComponent: AppLoadedInAnotherTabComponent;

    public isDisconnected = false;
    public userLogin: string;
    public showLoginScreen = false;
    public loadingInProgress = true;
    public applicationLoaded = false;
    displayEnvironmentName = false;
    environmentName: string;
    environmentColor: string;

    constructor(
        private authService: AuthService,
        private configServer: ConfigServer,
        private settingsService: SettingsService,
        private translateService: TranslateService,
        private userService: UserService,
        private entitiesService: EntitiesService,
        private groupsService: GroupsService,
        private businessDataService: BusinessDataService,
        private processesService: ProcessesService,
        private globalStyleService: GlobalStyleService,
        private lightCardsStoreService: LightCardsStoreService,
        private opfabEventStreamServer: OpfabEventStreamServer,
        private opfabEventStreamService: OpfabEventStreamService,
        private applicationUpdateService: ApplicationUpdateService,
        private systemNotificationService: SystemNotificationService,
        private opfabAPIService: OpfabAPIService,
        private translationService: TranslationService,
        private remoteLoggerServer: RemoteLoggerServer,
        private router: Router,
        private ngZone: NgZone
    ) {}

    ngOnInit() {
        ServicesConfig.setServers({
            configServer: this.configServer,
            remoteLoggerServer: this.remoteLoggerServer,
            translationService: this.translationService
        });

        // Set default style before login
        this.globalStyleService.setStyle('NIGHT');
        this.loadUIConfiguration();
    }

    private loadUIConfiguration() {
        ServicesConfig.load().subscribe({
            //This configuration needs to be loaded first as it defines the authentication mode
            next: () => {
                this.loadEnvironmentName();
                if (this.isUrlCheckActivated()) {
                    this.checkIfAppLoadedInAnotherTab();
                } else {
                    this.launchAuthenticationProcess();
                }
            },
            error: catchError((err, caught) => {
                logger.error('Impossible to load  application' + err);
                return caught;
            })
        });
    }

    private loadEnvironmentName() {
        this.environmentName = ConfigService.getConfigValue('environmentName');
        this.environmentColor = ConfigService.getConfigValue('environmentColor', 'blue');
        if (this.environmentName) {
            this.displayEnvironmentName = true;
        }
    }

    private isUrlCheckActivated(): boolean {
        return ConfigService.getConfigValue('checkIfUrlIsLocked', true);
    }

    private checkIfAppLoadedInAnotherTab(): void {
        this.loadingInProgress = false;
        this.appLoadedInAnotherTabComponent.execute();
        this.appLoadedInAnotherTabComponent.isFinishedWithoutError().subscribe(() => {
            this.launchAuthenticationProcess();
        });
        this.appLoadedInAnotherTabComponent.isFinishedWithErrors().subscribe(() => (this.isDisconnected = true));
    }

    private launchAuthenticationProcess(): void {
        this.loadingInProgress = true;
        logger.info(`Launch authentication process`);
        this.waitForEndOfAuthentication();
        this.authService.initializeAuthentication();
        if (this.authService.getAuthMode() === AuthenticationMode.PASSWORD)
            this.waitForEmptyTokenInStorageToShowLoginForm();
    }

    // Hack : in password mode when the token is not anymore in the storage
    // it means we need to show the login form
    // To have a cleaner code , we need to refactor the code
    // regarding authentication
    private waitForEmptyTokenInStorageToShowLoginForm() {
        if (!window.localStorage.getItem('token')) {
            this.showLoginScreen = true;
            this.loadingInProgress = false;
        } else if (!this.applicationLoaded) setTimeout(() => this.waitForEmptyTokenInStorageToShowLoginForm(), 100);
    }

    private waitForEndOfAuthentication(): void {
        CurrentUserStore.getCurrentUserLogin().subscribe((identifier) => {
            if (identifier) {
                logger.info(`User ${identifier} logged`);
                this.synchronizeUserTokenWithOpfabUserDatabase();
                this.showLoginScreen = false;
                this.userLogin = identifier;
                this.loadSettings();
            }
        });
    }

    private synchronizeUserTokenWithOpfabUserDatabase() {
        this.userService.synchronizeWithToken().subscribe({
            next: () => logger.info('Synchronization of user token with user database done'),
            error: () => logger.warn('Impossible to synchronize user token with user database')
        });
    }

    private loadSettings() {
        this.settingsService.getUserSettings().subscribe({
            next: (response) => {
                if (response.status === ServerResponseStatus.OK) {
                    logger.info('Settings loaded ' + JSON.stringify(response.data));
                    ConfigService.overrideConfigSettingsWithUserSettings(response.data);
                    this.checkIfAccountIsAlreadyUsed();
                } else {
                    if (response.status === ServerResponseStatus.NOT_FOUND) logger.info('No settings for user');
                    else if (response.status === ServerResponseStatus.FORBIDDEN) {
                        logger.error('Access forbidden when loading settings');
                        this.authService.logout();
                        return;
                    } else logger.error('Error when loading settings' + response.status);
                    this.checkIfAccountIsAlreadyUsed();
                }
            }
        });
    }

    private checkIfAccountIsAlreadyUsed(): void {
        this.loadingInProgress = false;
        this.accountAlreadyUsedComponent.execute();
        this.accountAlreadyUsedComponent.isFinishedWithoutError().subscribe(() => {
            this.loadingInProgress = true;
            this.loadAllConfigurations();
        });
    }

    private loadAllConfigurations(): void {
        const requestsToLaunch$ = [
            ConfigService.loadUiMenuConfig(),
            this.userService.loadUserWithPerimetersData(),
            this.entitiesService.loadAllEntitiesData(),
            this.groupsService.loadAllGroupsData(),
            this.processesService.loadAllProcessesWithLatestVersion(),
            this.processesService.loadAllProcessesWithAllVersions(),
            this.processesService.loadProcessGroups(),
            this.processesService.loadMonitoringConfig()
        ];
        Utilities.subscribeAndWaitForAllObservablesToEmitAnEvent(requestsToLaunch$).subscribe({
            next: () => {
                this.loadingInProgress = false;
                this.globalStyleService.loadUserStyle();
                this.chooseActivityArea();
            },
            error: catchError((err, caught) => {
                console.error('Error in application initialization', err);
                return caught;
            })
        });
    }

    private chooseActivityArea(): void {
        this.activityAreaChoiceAfterLoginComponent.execute();
        this.activityAreaChoiceAfterLoginComponent
            .isFinishedWithoutError()
            .subscribe(() => this.finalizeApplicationLoading());
    }

    private finalizeApplicationLoading(): void {
        this.loadingInProgress = true;
        this.opfabEventStreamService.initEventStream();
        this.opfabEventStreamServer.getStreamInitDone().subscribe(() => {
            this.applicationLoadedDone.next(true);
            this.applicationLoadedDone.complete();
            this.loadingInProgress = false;
            this.applicationLoaded = true;
        });
        this.lightCardsStoreService.initStore(); // this will effectively open the http stream connection
        this.applicationUpdateService.init();
        this.systemNotificationService.initSystemNotificationService();
        this.initOpfabAPI();
        loadBuildInTemplates();
    }

    private initOpfabAPI(): void {
        const that = this;

        opfab.navigate.showCardInFeed = function (cardId: string) {
            that.ngZone.run(() => that.router.navigate(['feed/cards/', cardId]));
        };

        this.opfabAPIService.initAPI();
    }
}
