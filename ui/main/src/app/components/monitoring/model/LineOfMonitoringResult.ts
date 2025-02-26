/* Copyright (c) 2018-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {I18n} from 'app/model/I18n';
import {TypeOfStateEnum} from '@ofServices/processes/model/Processes';

export interface LineOfMonitoringResult {
    creationDateTime: number;
    beginningOfBusinessPeriod: number;
    endOfBusinessPeriod: number;
    title: I18n;
    summary: I18n;
    titleTranslated: string;
    summaryTranslated: string;
    processName: string;
    cardId: string;
    cardUid: string;
    severity: string;
    processId: string;
    typeOfState: TypeOfStateEnum;
    answer: boolean;
    emitter: string;
    requiredResponses: string[];
    allowedOrRequiredResponses: string[];
}
