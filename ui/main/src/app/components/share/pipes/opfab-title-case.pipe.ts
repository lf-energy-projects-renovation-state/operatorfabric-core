/* Copyright (c) 2022, Alliander (http://www.alliander.com)
 * Copyright (c) 2023-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Pipe, PipeTransform} from '@angular/core';
import {ConfigService} from 'app/services/config/ConfigService';

@Pipe({
    name: 'opfabTitleCase',
    standalone: true
})
export class OpfabTitleCasePipe implements PipeTransform {
    private readonly titleToUppercase;

    constructor() {
        this.titleToUppercase = ConfigService.getConfigValue('feed.card.titleUpperCase', true);
    }

    transform(title: string): string {
        if (this.titleToUppercase) {
            return title.toUpperCase();
        } else {
            return title;
        }
    }
}
