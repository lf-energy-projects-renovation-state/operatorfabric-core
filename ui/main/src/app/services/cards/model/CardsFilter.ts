/* Copyright (c) 2022-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Filter} from './Filter';

export class CardsFilter {
    public constructor(
        readonly page: number,
        readonly size: number,
        readonly adminMode: boolean,
        readonly includeChildCards: boolean,
        readonly latestUpdateOnly: boolean,
        readonly filters: Filter[],
        readonly selectedFields?: string[]
    ) {}
}
