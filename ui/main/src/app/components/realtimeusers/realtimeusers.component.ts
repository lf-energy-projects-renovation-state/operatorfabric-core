/* Copyright (c) 2021-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {UserPreferencesService} from '@ofServices/userPreferences/UserPreferencesService';
import {MultiSelectConfig} from 'app/components/share/multi-select/model/MultiSelect';
import {ConfigServer} from '@ofServices/config/server/ConfigServer';
import {RealtimeUsersView} from 'app/views/realtimeusers/RealtimeUsersView';
import {RealtimePage} from 'app/views/realtimeusers/RealtimePage';
import {TranslateModule} from '@ngx-translate/core';
import {NgIf, NgFor} from '@angular/common';
import {SpinnerComponent} from '../share/spinner/spinner.component';
import {MultiSelectComponent} from '../share/multi-select/multi-select.component';

@Component({
    selector: 'of-realtimeusers',
    templateUrl: './realtimeusers.component.html',
    styleUrls: ['./realtimeusers.component.scss'],
    standalone: true,
    imports: [TranslateModule, FormsModule, ReactiveFormsModule, NgIf, SpinnerComponent, MultiSelectComponent, NgFor]
})
export class RealtimeusersComponent implements OnInit, OnDestroy {
    realTimeScreensForm: FormGroup<{
        realTimeScreen: FormControl<string | null>;
    }>;

    public multiSelectConfig: MultiSelectConfig = {
        labelKey: 'realTimeUsers.realTimeScreen',
        multiple: false,
        search: true
    };

    isPageLoaded: boolean = false;
    realtimeusersView: RealtimeUsersView;
    realtimePage: RealtimePage;
    initialScreenOption: string;

    constructor(private readonly configServer: ConfigServer) {}

    ngOnInit(): void {
        this.realTimeScreensForm = new FormGroup({
            realTimeScreen: new FormControl('')
        });

        this.realtimeusersView = new RealtimeUsersView(this.configServer);
        this.realtimeusersView.getPage().subscribe((realtimePage) => {
            if (realtimePage) {
                this.realtimePage = realtimePage;
                this.setInitialScreenOption();
            }
            this.isPageLoaded = true;
        });

        this.changeScreenWhenSelectScreen();
    }

    setInitialScreenOption(): void {
        const screenOptionPreference = Number(
            UserPreferencesService.getPreference('opfab.realTimeScreens.screenIndexToDisplayFirst')
        );
        this.initialScreenOption = this.realtimePage.screenOptions[screenOptionPreference]
            ? String(screenOptionPreference)
            : '0';
        this.realtimeusersView.setSelectedScreen(this.initialScreenOption);
    }

    changeScreenWhenSelectScreen(): void {
        this.realTimeScreensForm.get('realTimeScreen').valueChanges.subscribe((optionIndex) => {
            if (optionIndex) {
                this.realtimeusersView.setSelectedScreen(optionIndex);
                UserPreferencesService.setPreference('opfab.realTimeScreens.screenIndexToDisplayFirst', optionIndex);
            }
        });
    }

    ngOnDestroy() {
        if (this.realtimePage) this.realtimeusersView.stopUpdate();
    }

    isEllipsisActive(id: string): boolean {
        const element = document.getElementById(id);
        return element.offsetWidth < element.scrollWidth;
    }
}
