/* Copyright (c) 2023-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Observable, ReplaySubject} from 'rxjs';
import {ConfigServer} from '@ofServices/config/server/ConfigServer';
import {MonitoringConfig} from 'app/services/config/model/MonitoringConfig';
import {ServerResponse} from 'app/business/server/serverResponse';
import {RealTimeScreens} from 'app/services/config/model/RealTimeScreensConfig';
import {ProcessMonitoringConfig} from 'app/services/config/model/ProcessMonitoringConfig';

export class ConfigServerMock implements ConfigServer {
    private readonly webUiConf = new ReplaySubject<ServerResponse<any>>();
    private readonly menuConf = new ReplaySubject<ServerResponse<any>>();
    private readonly monitoringConf = new ReplaySubject<ServerResponse<MonitoringConfig>>();
    private readonly locale = new ReplaySubject<ServerResponse<any>>();
    private readonly realtimescreenconfiguration = new ReplaySubject<ServerResponse<RealTimeScreens>>();
    private readonly processmonitoringconfiguration = new ReplaySubject<ServerResponse<ProcessMonitoringConfig>>();

    getWebUiConfiguration(): Observable<ServerResponse<any>> {
        return this.webUiConf.asObservable();
    }

    getMenuConfiguration(): Observable<ServerResponse<any>> {
        return this.menuConf.asObservable();
    }

    getMonitoringConfiguration(): Observable<ServerResponse<MonitoringConfig>> {
        return this.monitoringConf.asObservable();
    }

    getLocale(localUrl: string): Observable<ServerResponse<any>> {
        return this.locale.asObservable();
    }

    getRealTimeScreenConfiguration(): Observable<ServerResponse<RealTimeScreens>> {
        return this.realtimescreenconfiguration.asObservable();
    }

    getProcessMonitoringConfiguration(): Observable<ServerResponse<ProcessMonitoringConfig>> {
        return this.processmonitoringconfiguration.asObservable();
    }

    setResponseForWebUIConfiguration(webuiConf: ServerResponse<any>) {
        this.webUiConf.next(webuiConf);
    }

    setResponseForMenuConfiguration(menuConf: ServerResponse<any>) {
        this.menuConf.next(menuConf);
    }

    setResponseForMonitoringConfiguration(monitoringConf: ServerResponse<MonitoringConfig>) {
        this.monitoringConf.next(monitoringConf);
    }

    setResponseForRealTimeScreenConfiguration(realtimeScreenConf: ServerResponse<any>) {
        this.realtimescreenconfiguration.next(realtimeScreenConf);
    }

    setResponseForProcessMonitoringConfiguration(processMonitoringConf: ServerResponse<ProcessMonitoringConfig>) {
        this.processmonitoringconfiguration.next(processMonitoringConf);
    }
}
