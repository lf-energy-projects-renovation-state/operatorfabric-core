/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Page} from 'app/model/Page';
import {UserActionLog} from '@ofServices/userActionLogs/model/UserActionLog';
import {Observable} from 'rxjs';
import {ServerResponse} from '../../../server/ServerResponse';

export abstract class UserActionLogsServer {
    abstract queryUserActionLogs(filters: Map<string, string[]>): Observable<ServerResponse<Page<UserActionLog>>>;
}
