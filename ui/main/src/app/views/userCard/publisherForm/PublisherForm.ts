/* Copyright (c) 2024-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Card} from 'app/model/Card';
import {EditionMode, InputFieldName, MultiselectItem, UserCardUIControl} from '../UserCardModel';
import {UsersService} from '@ofServices/users/UsersService';
import {EntitiesService} from '@ofServices/entities/EntitiesService';
import {RoleEnum} from '@ofServices/entities/model/RoleEnum';
import {ProcessesService} from '@ofServices/processes/ProcessesService';
import {UserCardTemplateGateway} from '@ofServices/templateGateway/UserCardTemplateGateway';

export class PublisherForm {
    private selectedPublisher: string;
    private editionMode: EditionMode;
    private publisherVisible = true;

    constructor(private readonly userCardUIControl: UserCardUIControl) {}

    public init(processId: string, stateId: string, card?: Card, editionMode?: EditionMode) {
        this.editionMode = editionMode;
        let entitiesAllowedToSendCard = this.getUserEntitiesWithCardSenderRole();
        entitiesAllowedToSendCard = this.filterEntitiesAllowedToCreateCardForState(
            entitiesAllowedToSendCard,
            processId,
            stateId
        );

        const state = ProcessesService.getProcess(processId).states.get(stateId);
        if (state) {
            this.publisherVisible = state.userCard?.publisherVisible ?? true;
        }
        const isPublisherVisible = entitiesAllowedToSendCard.length > 1 && this.publisherVisible;
        this.userCardUIControl.setInputVisibility(InputFieldName.Publisher, isPublisherVisible);

        const publishers = this.buildPublisherMultiselectList(entitiesAllowedToSendCard);
        const initialSelectedPublisher = this.getInitialSelectedPublisher(publishers, card);
        if (isPublisherVisible) {
            this.userCardUIControl.setPublisherList(publishers, initialSelectedPublisher);
        }
        this.selectPublisher(initialSelectedPublisher);
    }

    private getUserEntitiesWithCardSenderRole(): string[] {
        const user = UsersService.getCurrentUserWithPerimeters();
        return user.userData.entities?.filter((entity) => {
            return EntitiesService.getEntity(entity)?.roles?.includes(RoleEnum.CARD_SENDER);
        });
    }

    private filterEntitiesAllowedToCreateCardForState(
        entities: string[],
        processId: string,
        stateId: string
    ): string[] {
        const stateDefinition = ProcessesService.getProcess(processId).states.get(stateId);
        const publisherList = stateDefinition?.userCard?.publisherList;

        return publisherList
            ? entities.filter((entity) =>
                  EntitiesService.resolveEntities(publisherList)
                      .map((e) => e.id)
                      .includes(entity)
              )
            : entities;
    }

    private buildPublisherMultiselectList(entitiesId: string[]): MultiselectItem[] {
        const publisherList = entitiesId.map((entityId) => {
            const name = EntitiesService.getEntityName(entityId);
            return {id: entityId, label: name};
        });
        publisherList.sort((a, b) => a.label.localeCompare(b.label));
        return publisherList;
    }

    private getInitialSelectedPublisher(publishers: MultiselectItem[], card: Card): string {
        if (card && this.editionMode === EditionMode.EDITION) {
            return publishers.map((publisher) => publisher.id).includes(card.publisher)
                ? card.publisher
                : publishers[0].id;
        }
        return publishers[0].id;
    }

    private selectPublisher(publisher: string) {
        this.selectedPublisher = publisher;
        UserCardTemplateGateway.sendEntityUsedForSendingCardToTemplate(publisher);
    }

    public getSelectedPublisher(): string {
        return this.selectedPublisher;
    }

    public userSelectsPublisher(publisher: string) {
        if (!publisher || publisher === '') return;
        this.selectPublisher(publisher);
    }

    public isPublisherVisible(): boolean {
        return this.publisherVisible;
    }
}
