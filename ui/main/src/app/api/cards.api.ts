/* Copyright (c) 2024-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {firstValueFrom} from 'rxjs';
import {CardsService} from '../services/cards/CardsService';
import {CardResponseService} from '@ofServices/cardResponse/CardResponseService';

declare const opfab: any;

export function initCardsAPI() {
    opfab.cards = {
        getCards: function (cardsFilters) {
            return firstValueFrom(CardsService.fetchFilteredCards(cardsFilters));
        },
        sendResponseCard: function (parentCard, responseCard) {
            return CardResponseService.sendResponse(parentCard, responseCard);
        }
    };
}
