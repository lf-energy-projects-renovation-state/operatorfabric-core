/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Observable} from 'rxjs';
import {ServerResponse} from '../../../server/ServerResponse';

export abstract class UserSettingsServer {
    abstract getUserSettings(userId: string): Observable<ServerResponse<any>>;
    abstract patchUserSettings(userId: string, settings: any): Observable<ServerResponse<any>>;
}
