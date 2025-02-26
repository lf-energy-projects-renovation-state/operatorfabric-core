/* Copyright (c) 2018-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TranslateService, TranslateModule} from '@ngx-translate/core';
import {TypeOfStateEnum} from '@ofServices/processes/model/Processes';
import {Filter} from '@ofStore/lightcards/model/Filter';
import {MultiSelect, MultiSelectOption} from 'app/components/share/multi-select/model/MultiSelect';
import {MonitoringFilterBuilder} from './monitoring-filter-builder';
import {DEFAULT_PROCESS_GROUP_ID, MonitoringProcessList} from './monitoring-process-list';
import {TimelineButtonsComponent} from '../../../share/timeline-buttons/timeline-buttons.component';
import {NgIf} from '@angular/common';
import {MultiSelectComponent} from '../../../share/multi-select/multi-select.component';

@Component({
    selector: 'of-monitoring-filters',
    templateUrl: './monitoring-filters.component.html',
    styleUrls: ['./monitoring-filters.component.scss'],
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, TimelineButtonsComponent, NgIf, MultiSelectComponent, TranslateModule]
})
export class MonitoringFiltersComponent implements OnInit {
    monitoringForm = new FormGroup({
        processGroup: new FormControl([]),
        process: new FormControl([]),
        typeOfState: new FormControl([])
    });

    processGroupMultiSelect: MultiSelect;
    processMultiSelect: MultiSelect;
    typeOfStateMultiSelect: MultiSelect;

    @Output()
    eventForPublishingFilters: EventEmitter<Filter[]> = new EventEmitter<Filter[]>();

    constructor(
        private readonly translate: TranslateService,
        private readonly monitoringProcessList: MonitoringProcessList,
        private readonly monitoringFilterBuilder: MonitoringFilterBuilder
    ) {}

    ngOnInit() {
        this.initializeProcessGroupMultiSelect();
        this.initializeProcessMultiSelect();
        this.initializeTypeOfStateMultiSelect();
        this.sendQuery();
    }

    private initializeProcessGroupMultiSelect() {
        this.processGroupMultiSelect = {
            id: 'processGroup',
            config: {
                labelKey: 'shared.filters.processGroup',
                placeholderKey: 'shared.filters.selectProcessGroupText',
                sortOptions: true,
                nbOfDisplayValues: 4
            },
            options: [],
            selectedOptions: []
        };
        this.monitoringProcessList.getProcessGroups().forEach((processGroup) => {
            this.processGroupMultiSelect.options.push(
                new MultiSelectOption(
                    processGroup.id,
                    processGroup.id === DEFAULT_PROCESS_GROUP_ID
                        ? this.translate.instant('processGroup.defaultLabel')
                        : processGroup.name
                )
            );
        });
    }

    private initializeProcessMultiSelect() {
        this.processMultiSelect = {
            id: 'process',
            options: [],
            config: {
                labelKey: 'shared.filters.process',
                placeholderKey: 'shared.filters.selectProcessText',
                sortOptions: true,
                nbOfDisplayValues: 4
            },
            selectedOptions: []
        };
        this.putAllProcessesInProcessMultiSelect();
        this.changeProcessOptionsWhenSelectProcessGroups();
    }

    private putAllProcessesInProcessMultiSelect() {
        this.monitoringProcessList.getProcesses().forEach((process) => {
            this.processMultiSelect.options.push(new MultiSelectOption(process.id, process.name));
        });
    }

    private changeProcessOptionsWhenSelectProcessGroups(): void {
        this.monitoringForm.get(this.processGroupMultiSelect.id).valueChanges.subscribe((selectedProcessGroups) => {
            this.processMultiSelect.options = [];
            if (selectedProcessGroups.length === 0) this.putAllProcessesInProcessMultiSelect();
            else selectedProcessGroups.forEach((processGroup) => this.addProcessOptionsFromProcessGroup(processGroup));
        });
    }

    private addProcessOptionsFromProcessGroup(processGroup: string): void {
        const processes = this.monitoringProcessList.getProcessesForProcessGroup(processGroup);
        processes.forEach((process) =>
            this.processMultiSelect.options.push(new MultiSelectOption(process.id, process.name))
        );
    }

    private initializeTypeOfStateMultiSelect() {
        this.typeOfStateMultiSelect = {
            id: 'typeOfState',
            options: [
                new MultiSelectOption(
                    TypeOfStateEnum.INPROGRESS,
                    this.translate.instant('shared.typeOfState.INPROGRESS')
                ),
                new MultiSelectOption(TypeOfStateEnum.FINISHED, this.translate.instant('shared.typeOfState.FINISHED')),
                new MultiSelectOption(TypeOfStateEnum.CANCELED, this.translate.instant('shared.typeOfState.CANCELED'))
            ],
            config: {
                labelKey: 'shared.typeOfState.typeOfState',
                placeholderKey: 'monitoring.filters.typeOfState.selectTypeOfStateText',
                sortOptions: true,
                nbOfDisplayValues: 4
            },
            selectedOptions: []
        };
    }

    sendQuery() {
        const typeOfStates = this.getSelectedTypeOfStates();
        const process = this.getSelectedProcessesForQuery();
        this.monitoringFilterBuilder.setProcessList(process);
        this.monitoringFilterBuilder.setTypeOfStates(typeOfStates);
        this.sendFiltersToParentComponent();
    }

    private getSelectedTypeOfStates() {
        return this.monitoringForm.get(this.typeOfStateMultiSelect.id).value;
    }

    private getSelectedProcessesForQuery(): Array<string> {
        const selectedProcessGroups = this.getSelectedProcessGroups();
        let selectedProcesses = this.getSelectedProcesses();
        if (selectedProcessGroups?.length > 0 && selectedProcesses.length === 0)
            selectedProcesses = this.monitoringProcessList.getProcessesIdForProcessGroups(selectedProcessGroups);
        return selectedProcesses;
    }

    private getSelectedProcessGroups() {
        return this.monitoringForm.get(this.processGroupMultiSelect.id).value;
    }

    private getSelectedProcesses() {
        return this.monitoringForm.get(this.processMultiSelect.id).value;
    }

    private sendFiltersToParentComponent() {
        this.eventForPublishingFilters.emit(this.monitoringFilterBuilder.getFilters());
    }

    public isProcessGroupFilterVisible(): boolean {
        return this.processGroupMultiSelect.options.length > 1;
    }
    businessPeriodChanged() {
        this.sendFiltersToParentComponent();
    }

    resetForm() {
        this.typeOfStateMultiSelect.selectedOptions = [];
        this.processMultiSelect.selectedOptions = [];
        this.processGroupMultiSelect.selectedOptions = [];
        this.monitoringFilterBuilder.setProcessList([]);
        this.monitoringFilterBuilder.setTypeOfStates([]);
        this.sendFiltersToParentComponent();
    }
}
