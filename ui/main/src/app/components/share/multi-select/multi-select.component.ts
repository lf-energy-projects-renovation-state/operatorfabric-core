/* Copyright (c) 2022-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {AfterViewInit, Component, EventEmitter, Input, OnChanges, OnDestroy, Output} from '@angular/core';
import {UntypedFormGroup} from '@angular/forms';
import {TranslateService, TranslateModule} from '@ngx-translate/core';
import {MultiSelectConfig, MultiSelectOption} from 'app/components/share/multi-select/model/MultiSelect';
import * as _ from 'lodash-es';

declare const VirtualSelect: any;

@Component({
    selector: 'of-multi-select ',
    templateUrl: './multi-select.component.html',
    standalone: true,
    imports: [TranslateModule]
})
export class MultiSelectComponent implements AfterViewInit, OnDestroy, OnChanges {
    @Input() public parentForm: UntypedFormGroup;
    @Input() public multiSelectId: string;
    @Input() public config: MultiSelectConfig;
    @Input() public options: Array<MultiSelectOption>;
    @Input() public selectedOptions: any;

    @Output() selectionChange: EventEmitter<string[]> = new EventEmitter<string[]>();

    private oldOptions: Array<MultiSelectOption>;
    // It is important to initialize it with an empty array an not undefined to avoid
    // to trigger the change event when no option is selected on the first load
    // See Issue #7526
    private oldSelectedOptions = new Array<string>();

    private ngAfterViewInitHasBeenDone = false;
    private virtualSelectComponent: any;
    private disabled: boolean;

    constructor(private readonly translateService: TranslateService) {}

    ngAfterViewInit() {
        setTimeout(() => {
            // Hack : let the time to destroy on old version of a multiselect with same id
            this.createVirtualSelectComponent();
            this.setOptionList();
            this.setSelectedOptions();
            this.ngAfterViewInitHasBeenDone = true;
        }, 0);
    }

    public disable() {
        this.disabled = true;
        if (this.virtualSelectComponent) this.virtualSelectComponent.disable();
    }

    public enable() {
        this.disabled = false;
        if (this.virtualSelectComponent?.disabled) this.virtualSelectComponent.enable();
    }

    private createVirtualSelectComponent() {
        let placeholder = '';
        let nbOfDisplayValues = 50;
        let allowNewOption = false;
        let autoSelectFirstOption = false;
        if (this.config.placeholderKey) placeholder = this.translateService.instant(this.config.placeholderKey);
        if (this.config.nbOfDisplayValues) nbOfDisplayValues = this.config.nbOfDisplayValues;
        if (this.config.allowNewOption) allowNewOption = this.config.allowNewOption;
        if (this.config.autoSelectFirstOption) autoSelectFirstOption = this.config.autoSelectFirstOption;
        VirtualSelect.init({
            ele: '#' + this.multiSelectId,
            options: [],
            multiple: this.getValueOrDefault(this.config.multiple, true),
            search: this.getValueOrDefault(this.config.search, this.getValueOrDefault(this.config.multiple, true)),
            showValueAsTags: true,
            placeholder: placeholder,
            noOfDisplayValues: nbOfDisplayValues,
            selectAllOnlyVisible: true,
            optionsCount: 8,
            searchPlaceholderText: this.translateService.instant('multiSelect.searchPlaceholderText'),
            clearButtonText: this.translateService.instant('multiSelect.clearButtonText'),
            noOptionsText: this.translateService.instant('multiSelect.noOptionsText'),
            noSearchResultsText: this.translateService.instant('multiSelect.noSearchResultsText'),
            hideClearButton: !this.getValueOrDefault(this.config.multiple, true),
            enableSecureText: true, // Do not remove this important security control to avoid script injection see #3826
            allowNewOption: allowNewOption,
            autoSelectFirstOption: autoSelectFirstOption,
            labelRenderer: this.config.labelRenderer,
            selectedLabelRenderer: this.config.selectedLabelRenderer
        });

        this.virtualSelectComponent = document.querySelector('#' + this.multiSelectId);
        if (this.virtualSelectComponent) {
            const currentComponent = this;
            this.virtualSelectComponent.addEventListener('change', function () {
                currentComponent.setSelectedOptionsToParentForm();
            });
            if (this.disabled) this.virtualSelectComponent.disable();
        }
    }

    private setSelectedOptionsToParentForm() {
        if (!_.isEqual(this.oldSelectedOptions, this.virtualSelectComponent.value)) {
            this.parentForm.get(this.multiSelectId).setValue(this.virtualSelectComponent.value);
            this.oldSelectedOptions = _.clone(this.virtualSelectComponent.value);
            this.selectionChange.emit(this.virtualSelectComponent.value);
        }
    }

    private setOptionList() {
        if (this.options) {
            if (this.config.sortOptions) this.sortOptionListByLabel();
            this.oldOptions = this.options;
            if (this.virtualSelectComponent) this.virtualSelectComponent.setOptions(this.options);
        }
    }

    private sortOptionListByLabel() {
        this.options.sort((a, b) => {
            if (!(<any>a).label) return a;
            if (!(<any>b).label) return b;
            return (<any>a).label.localeCompare((<any>b).label);
        });
    }

    private setSelectedOptions() {
        if (this.selectedOptions && this.virtualSelectComponent)
            this.virtualSelectComponent.setValue(this.selectedOptions);
    }

    private getValueOrDefault(value: any, defaultValue: any): any {
        if (value !== undefined) return value;
        else return defaultValue;
    }

    ngOnChanges() {
        if (this.ngAfterViewInitHasBeenDone && this.hasSelectectedOrOptionListChanged()) {
            this.setOptionList();
            this.setSelectedOptions();
        }
    }

    private hasSelectectedOrOptionListChanged(): boolean {
        if (!_.isEqual(this.oldOptions, this.options)) return true;
        if (!_.isEqual(this.oldSelectedOptions, this.selectedOptions)) return true;
    }

    ngOnDestroy() {
        if (this.virtualSelectComponent) this.virtualSelectComponent.destroy();
    }
}
