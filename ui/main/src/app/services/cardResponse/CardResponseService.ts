/* Copyright (c) 2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Severity} from 'app/model/Severity';
import {Card} from 'app/model/Card';
import {CardForPublishing} from '@ofServices/cards/model/CardForPublishing';
import {NotificationDecision} from '@ofServices/notifications/NotificationDecision';
import {ProcessesService} from '@ofServices/processes/ProcessesService';
import {UserPermissionsService} from '@ofServices/userPermissions/UserPermissionsService';
import {UsersService} from '@ofServices/users/UsersService';
import {ServerResponseStatus} from 'app/server/ServerResponse';
import {CardsService} from '@ofServices/cards/CardsService';

export class CardResponseService {
    public static sendResponse(parentCard: Card, responseCard: any): Promise<void> {
        let publisherEntity = responseCard.publisher;
        if (!publisherEntity) {
            publisherEntity = this.getPublisherEntity(parentCard);
            if (!publisherEntity)
                return Promise.reject(new Error('No authorized publisher entity available for response'));
        } else if (!this.isUserEntityAllowedToRespond(publisherEntity, parentCard)) {
            return Promise.reject(
                new Error('Response card publisher not allowed : ' + JSON.stringify(publisherEntity))
            );
        }
        const entityRecipients = parentCard.entityRecipients ? [...parentCard.entityRecipients] : [];
        this.addPublisherToEntityRecipientsIfNotAlreadyPresent(publisherEntity, entityRecipients);

        const stateDef = ProcessesService.getProcess(parentCard.process).states.get(parentCard.state);

        const finalResponseCard: CardForPublishing = {
            publisher: publisherEntity,
            publisherType: 'ENTITY',
            processVersion: parentCard.processVersion,
            process: parentCard.process,
            processInstanceId: `${parentCard.processInstanceId}_${publisherEntity}`,
            state: responseCard.state ? responseCard.state : stateDef.response.state,
            startDate: parentCard.startDate,
            endDate: parentCard.endDate,
            expirationDate: parentCard.expirationDate,
            severity: responseCard.severity ? responseCard.severity : Severity.INFORMATION,
            entityRecipients: entityRecipients,
            userRecipients: parentCard.userRecipients,
            groupRecipients: parentCard.groupRecipients,
            externalRecipients: stateDef.response.externalRecipients,
            title: parentCard.title,
            summary: parentCard.summary,
            data: responseCard.data,
            parentCardId: parentCard.id,
            initialParentCardUid: parentCard.uid,
            actions: responseCard.actions
        };

        // Exclude card from sound and system notifications before publishing to avoid synchronization problems
        NotificationDecision.addSentCard(finalResponseCard.process + '.' + finalResponseCard.processInstanceId);

        return new Promise((resolve, reject) => {
            CardsService.postCard(finalResponseCard).subscribe((resp) => {
                if (resp.status !== ServerResponseStatus.OK) {
                    reject(new Error('Status: ' + resp.status + ' // Status message: ' + resp.statusMessage));
                } else {
                    resolve();
                }
            });
        });
    }

    private static getPublisherEntity(parentCard: Card): string {
        return UserPermissionsService.getUserEntitiesAllowedToRespond(
            UsersService.getCurrentUserWithPerimeters(),
            parentCard,
            ProcessesService.getProcess(parentCard.process)
        )[0];
    }

    private static isUserEntityAllowedToRespond(publisherEntity: string, parentCard: Card): boolean {
        const entities = UserPermissionsService.getUserEntitiesAllowedToRespond(
            UsersService.getCurrentUserWithPerimeters(),
            parentCard,
            ProcessesService.getProcess(parentCard.process)
        );
        return entities.includes(publisherEntity);
    }

    private static addPublisherToEntityRecipientsIfNotAlreadyPresent(
        publisher: string,
        entityRecipients: Array<string>
    ) {
        if (!entityRecipients?.includes(publisher)) {
            entityRecipients.push(publisher);
        }
    }
}
