/* Copyright (c) 2023-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Utilities} from 'app/business/common/utilities';
import {TranslationService} from 'app/business/services/translation/translation.service';

declare const opfab: any;

export function initUtilsAPI(translationService: TranslationService) {
    opfab.utils = {
        escapeHtml: function (html: string) {
            return Utilities.escapeHtml(html);
        },

        convertSpacesAndNewLinesInHTML: function (txt: string) {
            return Utilities.convertSpacesAndNewLinesInHTML(txt);
        },

        getTranslation: function (key, params) {
            return translationService.getTranslation(key, params);
        }
    };

    // prevent unwanted modifications from templates code
    Object.freeze(opfab.utils);
}
