/* Copyright (c) 2020, RTEi (http://www.rte-international.com)
 * Copyright (c) 2021-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {AsyncValidatorFn, FormControl, FormGroup, Validators} from '@angular/forms';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {User} from '@ofModel/user.model';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {UserService} from 'app/business/services/users/user.service';
import {GroupsService} from 'app/business/services/users/groups.service';
import {EntitiesService} from 'app/business/services/users/entities.service';
import {debounceTime, distinctUntilChanged, first, map, switchMap, tap} from 'rxjs/operators';
import {Observable, Subject} from 'rxjs';
import {MultiSelectConfig, MultiSelectOption} from '@ofModel/multiselect.model';

@Component({
    selector: 'of-edit-user-modal',
    templateUrl: './edit-user-modal.component.html',
    styleUrls: ['./edit-user-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditUserModalComponent implements OnInit {
    userForm: FormGroup<{
        login: FormControl<string | null>;
        firstName: FormControl<string | null>;
        lastName: FormControl<string | null>;
        comment: FormControl<string | null>;
        groups: FormControl<[] | null>;
        entities: FormControl<[] | null>;
        authorizedIPAddresses: FormControl<any>;
    }>;

    entitiesMultiSelectOptions: Array<MultiSelectOption> = [];
    selectedEntities = [];
    entitiesMultiSelectConfig: MultiSelectConfig = {
        labelKey: 'admin.input.user.entities',
        placeholderKey: 'admin.input.selectEntityText',
        sortOptions: true
    };

    groupsMultiSelectOptions: Array<MultiSelectOption> = [];
    selectedGroups = [];
    groupsMultiSelectConfig: MultiSelectConfig = {
        labelKey: 'admin.input.user.groups',
        placeholderKey: 'admin.input.selectGroupText',
        sortOptions: true
    };

    @Input() row: User;

    constructor(
        private activeModal: NgbActiveModal,
        private changeDetector: ChangeDetectorRef
    ) {}

    ngOnInit() {
        const uniqueLoginValidator = [];
        if (!this.row)
            // modal used for creating a new user
            uniqueLoginValidator.push(this.uniqueLoginValidatorFn());

        this.userForm = new FormGroup({
            login: new FormControl(
                '',
                [Validators.required, Validators.minLength(2), Validators.pattern(/^\S*$/)],
                uniqueLoginValidator
            ),
            firstName: new FormControl('', []),
            lastName: new FormControl('', []),
            comment: new FormControl('', []),
            groups: new FormControl([]),
            entities: new FormControl([]),
            authorizedIPAddresses: new FormControl('', [
                Validators.pattern(/^(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3},?)+$/)
            ])
        });

        if (this.row) {
            // If the modal is used for edition, initialize the modal with current data from this row

            // For 'simple' fields (where the value is directly displayed), we use the form's patching method
            const {login, firstName, lastName, comment} = this.row;
            this.userForm.patchValue({login, firstName, lastName, comment}, {onlySelf: false});

            if (this.row.authorizedIPAddresses) {
                this.userForm.patchValue({authorizedIPAddresses: this.row.authorizedIPAddresses.join(',')});
            }

            // Otherwise, we use the selectedItems property of the of-multiselect component
            UserService.getUser(login).subscribe((user) => {
                this.selectedEntities = user.entities;
                this.selectedGroups = user.groups;
                this.changeDetector.markForCheck();
            });
        }

        // Initialize value lists for Entities and Groups inputs
        EntitiesService.getEntities().forEach((entity) => {
            const id = entity.id;
            const itemName = entity.name ?? id;
            this.entitiesMultiSelectOptions.push(new MultiSelectOption(id, itemName));
        });

        GroupsService.getGroups().forEach((group) => {
            const id = group.id;
            const itemName = group.name ?? id;
            this.groupsMultiSelectOptions.push(new MultiSelectOption(id, itemName));
        });
    }

    update() {
        this.cleanForm();
        const isAuthorizedIPAdressesAString = this.userForm.value['authorizedIPAddresses'];
        const ipList =
            isAuthorizedIPAdressesAString && this.authorizedIPAddresses.value.trim().length > 0
                ? this.authorizedIPAddresses.value.split(',')
                : [];
        this.authorizedIPAddresses.setValue(ipList.map((str) => str.trim()));
        UserService.update(this.userForm.value).subscribe(() => {
            this.activeModal.close('Update button clicked on user modal');
            // We call the activeModal "close" method and not "dismiss" to indicate that the modal was closed because the
            // user chose to perform an action (here, update the selected item).
            // This is important as code in the corresponding table components relies on the resolution of the
            // `NgbMobalRef.result` promise to trigger a refresh of the data shown on the table.
        });
    }

    isUniqueLogin(login: string): Observable<boolean> {
        const subject = new Subject<boolean>();

        if (login) {
            UserService.queryAllUsers().subscribe((users) => {
                if (users.filter((user) => user.login === login).length) subject.next(false);
                else subject.next(true);
            });
        } else subject.next(true);
        return subject.asObservable();
    }

    uniqueLoginValidatorFn(): AsyncValidatorFn {
        return (control) =>
            control.valueChanges.pipe(
                debounceTime(500),
                distinctUntilChanged(),
                switchMap((value) => {
                    return this.isUniqueLogin(value);
                }),
                map((unique: boolean) => (unique ? null : {uniqueLoginViolation: true})),
                first(),
                tap(() => this.changeDetector.markForCheck())
            ); // important to make observable finite
    }

    private cleanForm() {
        if (this.row) {
            this.userForm.value['login'] = this.row.login;
        }
        this.login.setValue((this.login.value as string).trim());
        if (this.lastName.value) this.lastName.setValue((this.lastName.value as string).trim());
        if (this.firstName.value) this.firstName.setValue((this.firstName.value as string).trim());
        if (this.comment.value) this.comment.setValue((this.comment.value as string).trim());
    }

    get login() {
        return this.userForm.get('login');
    }

    get firstName() {
        return this.userForm.get('firstName');
    }

    get lastName() {
        return this.userForm.get('lastName');
    }

    get comment() {
        return this.userForm.get('comment');
    }

    get groups() {
        return this.userForm.get('groups');
    }

    get entities() {
        return this.userForm.get('entities');
    }

    get authorizedIPAddresses() {
        return this.userForm.get('authorizedIPAddresses');
    }

    dismissModal(reason: string): void {
        this.activeModal.dismiss(reason);
    }
}
