/* Copyright (c) 2022-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Directive, Injectable} from '@angular/core';
import {NgbModal, NgbModalOptions} from '@ng-bootstrap/ng-bootstrap';
import {TranslateService} from '@ngx-translate/core';
import {MessageLevel} from '@ofServices/alerteMessage/model/Message';
import {AlertMessageService} from '@ofServices/alerteMessage/AlertMessageService';
import {ExternalDevicesService} from '@ofServices/notifications/ExternalDevicesService';
import {
    ColDef,
    GridOptions,
    ICellRendererParams,
    AllCommunityModule,
    ModuleRegistry,
    provideGlobalGridOptions
} from 'ag-grid-community';
import {CheckboxCellRendererComponent} from 'app/components/admin/components/cell-renderers/checkbox-cell-renderer.component';
import {Observable} from 'rxjs';
import {ActionCellRendererComponent} from '../../admin/components/cell-renderers/action-cell-renderer.component';
import {ModalService} from '@ofServices/modal/ModalService';
import {I18n} from 'app/model/I18n';
import {SignalMappingsCellRendererComponent} from 'app/components/admin/components/cell-renderers/signal-mappings-cell-renderer.component';
import {AgGrid} from 'app/utils/AgGrid';

@Directive()
@Injectable()
export abstract class ExternalDevicesConfigurationDirective {
    configurations: any[];
    gridOptions: GridOptions;
    public gridApi;
    public pageSize = 10;
    public page = 1;
    private readonly columnDefs: ColDef[] = [];
    public editModalComponent;
    modalOptions: NgbModalOptions = {
        backdrop: 'static', // Modal shouldn't close even if we click outside it
        size: 'lg'
    };
    i18NPrefix = 'externalDevicesConfiguration.';
    technicalError = false;

    protected fields: Field[];
    protected canAddItems: boolean;
    protected addItemLabel = 'externalDevicesConfiguration.input.add';
    private isLoadingData = true;
    protected waitingDeviceResponse: boolean;
    protected showSpinner: boolean;

    constructor(
        protected translateService: TranslateService,
        protected modalService: NgbModal
    ) {
        ModuleRegistry.registerModules([AllCommunityModule]);
        provideGlobalGridOptions({theme: 'legacy'});

        this.gridOptions = <GridOptions>{
            ...AgGrid.getDefaultGridOptions(),
            context: {
                componentParent: this
            },
            defaultColDef: {
                editable: false,
                headerValueGetter: this.localizeHeader.bind(this)
            },
            components: {
                actionCellRenderer: ActionCellRendererComponent,
                checkboxCellRenderer: CheckboxCellRendererComponent,
                signalMappingsCellRenderer: SignalMappingsCellRendererComponent
            },
            columnDefs: this.columnDefs,
            getRowHeight: this.getRowHeight,
            columnTypes: {
                dataColumn: {
                    sortable: true,
                    filter: true,
                    wrapText: true,
                    autoHeight: true,
                    flex: 1,
                    resizable: false
                },
                actionColumn: {
                    field: '',
                    sortable: false,
                    filter: false,
                    minWidth: 90,
                    flex: 1,
                    cellRenderer: 'actionCellRenderer',
                    resizable: false
                },
                checkboxColumn: {
                    field: '',
                    sortable: false,
                    filter: false,
                    minWidth: 90,
                    flex: 1,
                    cellRenderer: 'checkboxCellRenderer',
                    resizable: false
                },
                signalMappingsColumn: {
                    field: '',
                    sortable: false,
                    filter: false,
                    minWidth: 90,
                    flex: 1,
                    cellRenderer: 'signalMappingsCellRenderer',
                    resizable: false
                }
            },
            popupParent: document.querySelector('body')
        };
    }

    getRowHeight(): number {
        return 45;
    }
    public localizeHeader(parameters: ICellRendererParams): string {
        const headerIdentifier = parameters.colDef.headerName;
        return this.translateService.instant(this.i18NPrefix + headerIdentifier);
    }

    onGridReady(params) {
        this.gridApi = params.api;
        this.gridApi.setGridOption('paginationPageSize', this.pageSize);

        this.gridApi.setGridOption('columnDefs', this.createColumnDefs(this.fields));

        this.refreshData();
    }

    /** This function generates the ag-grid `ColumnDefs` for the grid from a list of fields
     * @param fields: string[] containing the name of the fields to display as columns in the table. They should match the
     * name of the fields returned by the API for the type in question.
     * @return ColDef[] object containing the column definitions for the grid
     * */
    createColumnDefs(fields: Field[]): ColDef[] {
        // Create data columns from fields
        const columnDefs = new Array(fields.length);

        fields.forEach((field: Field, index: number) => {
            const columnDef = {
                type: field.type,
                headerName: field.name,
                field: field.name,
                colId: field.name,
                cellClass: field.name === 'supportedSignals' ? 'opfab-ag-cell-with-no-padding-right' : null
            };

            columnDefs[index] = columnDef;
        });

        return columnDefs;
    }

    updateResultPage(currentPage): void {
        this.refreshData();
        this.gridApi.paginationGoToPage(currentPage - 1);
        this.page = currentPage;
    }

    refreshData() {
        this.isLoadingData = true;
        this.queryData().subscribe({
            next: (configurations) => {
                this.technicalError = false;
                this.configurations = configurations;
                this.isLoadingData = false;
            },
            error: () => {
                this.technicalError = true;
                this.isLoadingData = false;
            }
        });
    }

    abstract queryData(): Observable<any[]>;

    createNewItem() {
        const modalRef = this.modalService.open(this.editModalComponent, this.modalOptions);
        modalRef.componentInstance.configurations = this.configurations;
        modalRef.result.then(
            // Hooking the refresh of the data to the closing of the modal seemed simpler than setting up
            // NGRX actions and effects for this sole purpose
            () => {
                // If modal is closed
                this.refreshData(); // This refreshes the data when the modal is closed after a change
            },
            () => {
                // If modal is dismissed (by clicking the "close" button, the top right cross icon
                // or clicking outside the modal, there is no need to refresh the data
            }
        );
    }

    openActionModal(params) {
        // This method might be flagged as "unused" by IDEs, but it's actually called through the ActionCellRendererComponent
        const columnId = params.colDef.colId;

        if (columnId === 'edit') {
            const modalRef = this.modalService.open(this.editModalComponent, this.modalOptions);
            modalRef.componentInstance.row = params.data; // This passes the data from the edited row to the modal to initialize input values.

            modalRef.result.then(
                () => {
                    // If modal is closed
                    this.refreshData(); // This refreshes the data when the modal is closed after a change
                },
                () => {
                    // If the modal is dismissed (by clicking the "close" button, the top right cross icon
                    // or clicking outside the modal, there is no need to refresh the data
                }
            );
        }

        if (columnId === 'delete') {
            this.openDeleteConfirmationDialog(params.data);
        }
    }
    openDeleteConfirmationDialog(row: any): any {
        const confirmDeleteUserMessage = `${this.translateService.instant('externalDevicesConfiguration.input.confirmDelete')} ${row['userLogin']} ?`;

        ModalService.openConfirmationModal(
            new I18n('externalDevicesConfiguration.input.confirm'),
            confirmDeleteUserMessage
        ).then((confirmed) => {
            if (confirmed) {
                // The data refresh is launched inside the subscribe to make sure that the deletion request has been (correctly)
                // handled first
                ExternalDevicesService.deleteByUserLogin(row['userLogin']).subscribe(() => {
                    this.refreshData();
                });
            }
        });
    }

    protected displayMessage(i18nKey: string, msg: string, severity: MessageLevel = MessageLevel.ERROR) {
        AlertMessageService.sendAlertMessage({message: msg, level: severity, i18n: {key: i18nKey}});
    }
}

export class Field {
    public name: string;
    public type: string;

    /**
     * @param name: should match the property name in the underlying row data. Will be used as key to find i18n label for the column header.
     * @param fieldType: the type of the input in the ag grid
     **/
    constructor(name: string, fieldType: FieldType = FieldType.DATA_COLUMN) {
        this.name = name;
        this.type = fieldType;
    }
}

export enum FieldType {
    DATA_COLUMN = 'dataColumn',
    ACTION_COLUMN = 'actionColumn',
    CHECKBOX_COLUMN = 'checkboxColumn',
    SIGNAL_MAPPINGS = 'signalMappingsColumn'
}
