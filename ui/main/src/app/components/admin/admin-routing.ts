/* Copyright (c) 2018-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Routes} from '@angular/router';
import {AdminComponent} from './admin.component';
import {UsersTableComponent} from './components/table/users-table.component';
import {GroupsTableComponent} from './components/table/groups-table.component';
import {EntitiesTableComponent} from './components/table/entities-table.component';
import {PerimetersTableComponent} from './components/table/perimeters-table.component';
import {ProcessesTableComponent} from './components/table/processes-table.component';
import {BusinessDataTableComponent} from './components/table/businessData-table.component';
import {SupervisedEntitiesTableComponent} from './components/table/supervised-entities-table.component';

const defaultPath = 'users';

const routes: Routes = [
    {
        path: '',
        component: AdminComponent,
        children: [
            {
                path: 'users',
                component: UsersTableComponent
            },
            {
                path: 'entities',
                component: EntitiesTableComponent
            },
            {
                path: 'groups',
                component: GroupsTableComponent
            },
            {
                path: 'perimeters',
                component: PerimetersTableComponent
            },
            {
                path: 'processes',
                component: ProcessesTableComponent
            },
            {
                path: 'businessData',
                component: BusinessDataTableComponent
            },
            {
                path: 'supervisedEntities',
                component: SupervisedEntitiesTableComponent
            },
            {path: '**', redirectTo: defaultPath}
        ]
    }
];

export default routes;
