/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {TranslateService, TranslateModule} from '@ngx-translate/core';
import {Card} from 'app/model/Card';
import {DisplayContext} from 'app/model/DisplayContext';
import {DateTimeFormatterService} from 'app/services/dateTimeFormatter/DateTimeFormatterService';
import {EntitiesService} from '@ofServices/entities/EntitiesService';
import {Utilities} from '../../../../utils/Utilities';
import {SimplifiedCardViewComponent} from '../../../share/simplified-card-view/simplified-card-view.component';
import {NgIf} from '@angular/common';

@Component({
    selector: 'of-archived-card-detail',
    templateUrl: './archived-card-detail.component.html',
    styleUrls: ['./archived-card-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SimplifiedCardViewComponent, TranslateModule, NgIf]
})
export class ArchivedCardDetailComponent implements OnInit {
    fromEntityOrRepresentativeSelectedCard = null;
    entityRecipientsForFooter = '';
    entityRecipientsForInformationForFooter = '';

    displayContext: any = DisplayContext.ARCHIVE;

    @Input() card: Card;
    @Input() childCards: Card[];

    constructor(private readonly translate: TranslateService) {}

    ngOnInit() {
        this.computeFromEntity();
        this.computeEntityRecipientsForFooter();
        this.computeEntityRecipientsForInformationForFooter();
    }

    private computeFromEntity() {
        switch (this.card.publisherType) {
            case 'ENTITY':
                this.fromEntityOrRepresentativeSelectedCard = EntitiesService.getEntityName(this.card.publisher);

                if (this.card.representativeType && this.card.representative) {
                    const representative =
                        this.card.representativeType === 'ENTITY'
                            ? EntitiesService.getEntityName(this.card.representative)
                            : this.card.representative;

                    this.fromEntityOrRepresentativeSelectedCard += ' (' + representative + ')';
                }
                break;
            case 'USER':
                this.fromEntityOrRepresentativeSelectedCard = this.card.publisher;
                break;
            default:
                this.fromEntityOrRepresentativeSelectedCard = null;
        }
    }

    private computeEntityRecipientsForFooter() {
        const listOfEntityRecipients = [];
        this.entityRecipientsForFooter = '';

        if (this.card.entityRecipients) {
            const entityRecipientsForFooter = Utilities.removeElementsFromArray(
                this.card.entityRecipients,
                this.card.entityRecipientsForInformation
            );

            entityRecipientsForFooter.forEach((entityRecipient) => {
                listOfEntityRecipients.push(EntitiesService.getEntityName(entityRecipient));
            });
        }
        listOfEntityRecipients.sort((a, b) => a.localeCompare(b));

        listOfEntityRecipients.forEach((entityRecipient) => {
            this.entityRecipientsForFooter += ' ' + entityRecipient + ',';
        });
        if (this.entityRecipientsForFooter.length > 0) {
            this.entityRecipientsForFooter =
                this.translate.instant('feed.entityRecipients') + this.entityRecipientsForFooter.slice(0, -1); // we remove the last comma
        }
    }

    private computeEntityRecipientsForInformationForFooter() {
        const listOfEntityRecipientsForInformation = [];
        this.entityRecipientsForInformationForFooter = '';

        if (this.card.entityRecipientsForInformation) {
            this.card.entityRecipientsForInformation.forEach((entityRecipientForInformation) => {
                listOfEntityRecipientsForInformation.push(EntitiesService.getEntityName(entityRecipientForInformation));
            });
        }
        listOfEntityRecipientsForInformation.sort((a, b) => a.localeCompare(b));

        listOfEntityRecipientsForInformation.forEach((entityRecipientForInformation) => {
            this.entityRecipientsForInformationForFooter += ' ' + entityRecipientForInformation + ',';
        });
        if (this.entityRecipientsForInformationForFooter.length > 0) {
            this.entityRecipientsForInformationForFooter =
                this.translate.instant('feed.entityRecipientsForInformation') +
                this.entityRecipientsForInformationForFooter.slice(0, -1); // we remove the last comma
        }
    }

    getFormattedDateAndTime(date: number): any {
        return DateTimeFormatterService.getFormattedDateAndTime(date);
    }

    getFormattedDate(date: number): any {
        return DateTimeFormatterService.getFormattedDate(date);
    }

    getFormattedTime(date: number): any {
        return DateTimeFormatterService.getFormattedTime(date);
    }
}
