/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {AlertMessageService} from '@ofServices/alerteMessage/AlertMessageService';
import {ConfigService} from 'app/services/config/ConfigService';
import {AlertPage} from './AlertPage';
import {Message, MessageLevel} from '@ofServices/alerteMessage/model/Message';
import {LogOption, LoggerService as logger} from 'app/services/logs/LoggerService';
import {TranslationService} from '@ofServices/translation/TranslationService';

export class AlertView {
    private readonly alarmMessageAutoClose: boolean;
    private readonly alertPage: AlertPage;
    private lastMessageDate: number;

    constructor() {
        this.alarmMessageAutoClose = ConfigService.getConfigValue('alerts.alarmLevelAutoClose', false);
        this.alertPage = new AlertPage();
        this.alertPage.style = 'top: 0';
        if (ConfigService.getConfigValue('alerts.messageOnBottomOfTheScreen', false))
            this.alertPage.style = 'bottom: 0';

        AlertMessageService.getAlertMessage().subscribe((message: Message) => this.processAlertMessage(message));
    }

    private processAlertMessage(message: Message) {
        this.alertPage.display = true;
        if (message.i18n?.key)
            this.alertPage.message = TranslationService.getTranslation(message.i18n.key, message.i18n.parameters);
        else this.alertPage.message = message.message;
        logger.debug(`AlertMessage : ${this.alertPage.message}`, LogOption.LOCAL_AND_REMOTE);
        this.alertPage.backgroundColor = this.getBackgroundColor(message.level);
        this.lastMessageDate = new Date().valueOf();
        if (message.level !== MessageLevel.ALARM || this.alarmMessageAutoClose)
            setTimeout(() => {
                // to avoid closing a message which replace a previous one
                if (new Date().valueOf() - this.lastMessageDate >= 5000) this.alertPage.display = false;
            }, 5000);
    }

    private getBackgroundColor(messageLevel: MessageLevel) {
        switch (messageLevel) {
            case MessageLevel.DEBUG:
                return '#0070da';
            case MessageLevel.INFO:
                return '#67a854';
            case MessageLevel.ERROR:
                return '#e87a08';
            case MessageLevel.ALARM:
                return '#a71a1a';
            default:
                return '#0070da';
        }
    }

    public getAlertPage(): AlertPage {
        return this.alertPage;
    }

    public closeAlert() {
        this.alertPage.display = false;
    }
}
