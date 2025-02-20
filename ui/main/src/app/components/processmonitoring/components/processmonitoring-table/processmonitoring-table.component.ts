/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {TranslateService, TranslateModule} from '@ngx-translate/core';
import {
    ColDef,
    GridOptions,
    AllCommunityModule,
    ModuleRegistry,
    provideGlobalGridOptions,
    FilterModel
} from 'ag-grid-community';
import {Card} from 'app/model/Card';
import {TimeCellRendererComponent} from '../cell-renderers/time-cell-renderer.component';
import {SenderCellRendererComponent} from '../cell-renderers/sender-cell-renderer.component';
import {NgbModal, NgbModalOptions, NgbModalRef, NgbPagination} from '@ng-bootstrap/ng-bootstrap';
import {SelectedCardService} from '../../../../services/selectedCard/SelectedCardService';
import {AgGridAngular} from 'ag-grid-angular';
import {NgIf} from '@angular/common';
import {CardComponent} from '../../../card/card.component';
import {ProcessMonitoringField, ProcessMonitoringFieldEnum} from '@ofServices/config/model/ProcessMonitoringConfig';
import {AgGrid} from 'app/utils/AgGrid';

@Component({
    selector: 'of-processmonitoring-table',
    templateUrl: './processmonitoring-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [AgGridAngular, NgIf, TranslateModule, NgbPagination, CardComponent]
})
export class ProcessmonitoringTableComponent {
    @ViewChild('cardDetail') cardDetailTemplate: ElementRef;
    @Input() result: Card[];
    @Input() processGroupVisible: boolean;
    @Input() totalElements: number;
    @Input() totalPages: number;
    @Input() page: number;
    @Input() pageSize: number;
    @Input() processStateNameMap: Map<string, string>;
    @Input() processStateDescriptionMap: Map<string, string>;
    @Input() processMonitoringFields: ProcessMonitoringField[];

    @Output() pageChange = new EventEmitter<number>();
    @Output() filterChange = new EventEmitter<{filterModel: FilterModel; colId: string}>();
    @Output() export = new EventEmitter<number>();

    modalRef: NgbModalRef;

    // ag-grid configuration objects
    gridOptions;
    public gridApi;

    private columnDefs: ColDef[] = [];

    constructor(
        private readonly translate: TranslateService,
        private readonly modalService: NgbModal
    ) {
        ModuleRegistry.registerModules([AllCommunityModule]);
        provideGlobalGridOptions({theme: 'legacy'});

        this.gridOptions = <GridOptions>{
            ...AgGrid.getDefaultGridOptions(),
            context: {
                componentParent: this
            },
            components: {
                timeCellRenderer: TimeCellRendererComponent,
                senderCellRenderer: SenderCellRendererComponent
            },
            defaultColDef: {
                editable: false,
                wrapHeaderText: true
            },
            columnTypes: {
                summaryColumn: {
                    sortable: false,
                    filter: true,
                    filterParams: {
                        suppressAndOrCondition: true
                    },
                    wrapText: false,
                    autoHeight: true,
                    flex: 1,
                    resizable: false
                },
                severityColumn: {
                    sortable: false,
                    filter: false,
                    wrapText: false,
                    autoHeight: false,
                    maxWidth: 18,
                    resizable: false
                }
            },
            columnDefs: this.columnDefs,
            popupParent: document.querySelector('body')
        };
    }

    onFilterChanged(ev) {
        this.filterChange.next({filterModel: this.gridApi.getFilterModel(), colId: ev.columns[0]?.colId});
    }

    onGridReady(params) {
        this.gridApi = params.api;

        const severityCellClassRules = {
            'opfab-sev-alarm': (field) => field.value === 1,
            'opfab-sev-action': (field) => field.value === 2,
            'opfab-sev-compliant': (field) => field.value === 3,
            'opfab-sev-information': (field) => field.value === 4
        };

        this.columnDefs = [
            {
                type: 'severityColumn',
                headerName: '',
                field: 'severityNumber',
                headerClass: 'opfab-ag-header-with-no-padding',
                cellClassRules: severityCellClassRules
            }
        ];

        if (this.processMonitoringFields) {
            const columnSizeAverage = this.computeColumnSizeAverage();

            this.processMonitoringFields.forEach((column) => {
                if (column.type === ProcessMonitoringFieldEnum.DATE) {
                    this.columnDefs.push({
                        type: 'summaryColumn',
                        headerName: column.colName,
                        cellRenderer: 'timeCellRenderer',
                        field: String(column.field).split('.').pop(),
                        headerClass: 'opfab-ag-cheader-with-right-padding',
                        flex: isNaN(Number(column.size)) ? 1 : Number(column.size) / columnSizeAverage,
                        resizable: false,
                        colId: column.field
                    });
                } else {
                    this.columnDefs.push({
                        type: 'summaryColumn',
                        headerName: column.colName,
                        field: String(column.field).split('.').pop(),
                        headerClass: 'opfab-ag-cheader-with-right-padding',
                        cellClass: 'opfab-ag-cell-with-no-padding',
                        flex: isNaN(Number(column.size)) ? 1 : Number(column.size) / columnSizeAverage,
                        resizable: false,
                        colId: column.field
                    });
                }
            });
        }

        this.gridApi.setGridOption('columnDefs', this.columnDefs);
    }

    computeColumnSizeAverage(): number {
        let columnSizeAverage = 0;
        this.processMonitoringFields.forEach((column) => {
            columnSizeAverage += isNaN(Number(column.size)) ? 1 : Number(column.size);
        });
        return columnSizeAverage / this.processMonitoringFields.length;
    }

    updateResultPage(currentPage): void {
        this.pageChange.next(currentPage);
    }

    exportToExcel() {
        this.export.next(null);
    }

    selectCard(info) {
        SelectedCardService.setSelectedCardId(info);
        const options: NgbModalOptions = {
            size: 'fullscreen'
        };
        this.modalRef = this.modalService.open(this.cardDetailTemplate, options);

        // Clear card selection when modal is dismissed by pressing escape key or clicking outside of modal
        // Closing event is already handled in card detail component
        this.modalRef.dismissed.subscribe(() => {
            SelectedCardService.clearSelectedCardId();
        });
    }
}
