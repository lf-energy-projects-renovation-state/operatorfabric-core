/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {EntitiesService} from '@ofServices/entities/EntitiesService';
import {GroupsService} from '@ofServices/groups/GroupsService';
import {LogOption, LoggerService as logger} from 'app/services/logs/LoggerService';
import {TemplateCssService} from '@ofServices/templateCss/TemplateCssService';
import {UsersService} from '@ofServices/users/UsersService';
import {HandlebarsService} from '@ofServices/handlebars/HandlebarsService';
import {debounce, timer, map, catchError, switchMap} from 'rxjs';
import {Utilities} from '../../utils/Utilities';
import {ApplicationEventsService} from './ApplicationEventsService';
import {OpfabEventStreamService} from './OpfabEventStreamService';
import {ProcessesService} from '../processes/ProcessesService';
import {BusinessDataService} from '../businessdata/businessdata.service';
import {ConfigService} from '../config/ConfigService';

export class ApplicationUpdateService {
    public static init() {
        ApplicationUpdateService.listenForBusinessConfigUpdate();
        ApplicationUpdateService.listenForUserConfigUpdate();
        ApplicationUpdateService.listenForBusinessDataUpdate();
        ApplicationUpdateService.listenForMonitoringConfigUpdate();
    }

    private static listenForBusinessConfigUpdate() {
        OpfabEventStreamService.getBusinessConfigChangeRequests()
            .pipe(
                debounce(() => timer(5000 + Math.floor(Math.random() * 5000))), // use a random  part to avoid all UI to access at the same time the server
                map(() => {
                    logger.info('Update business config');
                    HandlebarsService.clearCache();
                    TemplateCssService.clearCache();
                    ProcessesService.loadAllProcessesWithLatestVersion().subscribe();
                    ProcessesService.loadAllProcessesWithAllVersions().subscribe();
                    ProcessesService.loadProcessGroups().subscribe();
                }),
                catchError((error, caught) => {
                    logger.error('Error in update business config ', error);
                    return caught;
                })
            )
            .subscribe();
    }

    private static listenForUserConfigUpdate() {
        OpfabEventStreamService.getUserConfigChangeRequests()
            .pipe(
                debounce(() => timer(5000 + Math.floor(Math.random() * 5000))), // use a random  part to avoid all UI to access at the same time the server
                switchMap(() => {
                    const requestsToLaunch$ = [
                        UsersService.loadUserWithPerimetersData(),
                        EntitiesService.loadAllEntitiesData(),
                        GroupsService.loadAllGroupsData()
                    ];
                    logger.info('Update user perimeter, entities and groups', LogOption.LOCAL_AND_REMOTE);
                    return Utilities.subscribeAndWaitForAllObservablesToEmitAnEvent(requestsToLaunch$);
                }),
                map(() => ApplicationEventsService.setUserConfigChange()),
                catchError((error, caught) => {
                    logger.error('Error in update user config ', error);
                    return caught;
                })
            )
            .subscribe();
    }

    private static listenForBusinessDataUpdate() {
        OpfabEventStreamService.getBusinessDataChanges().subscribe(() => {
            logger.info(`New business data posted, emptying cache`, LogOption.LOCAL_AND_REMOTE);
            BusinessDataService.emptyCache();
        });
    }

    private static listenForMonitoringConfigUpdate() {
        OpfabEventStreamService.getMonitoringConfigChangeRequests().subscribe(() => {
            logger.info(`Update monitoring configuration`, LogOption.LOCAL_AND_REMOTE);
            ConfigService.loadMonitoringConfig().subscribe();
            ConfigService.loadProcessMonitoringConfig().subscribe();
        });
    }
}
