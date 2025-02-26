/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {environment} from '@env/environment';
import {BusinessDataServer} from '@ofServices/businessdata/server/BusinessDataServer';
import {ServerResponse} from 'app/server/ServerResponse';
import {Observable} from 'rxjs';
import {AngularServer} from '../../../server/AngularServer';

@Injectable({
    providedIn: 'root'
})
export class AngularBusinessDataServer extends AngularServer implements BusinessDataServer {
    readonly businessDataUrl: string;

    constructor(private readonly httpClient: HttpClient) {
        super();
        this.businessDataUrl = `${environment.url}businessconfig/businessData`;
    }

    getBusinessData(resourceName: string): Observable<ServerResponse<any>> {
        return this.processHttpResponse(this.httpClient.get(`${this.businessDataUrl}` + '/' + resourceName));
    }

    deleteById(id: string): Observable<ServerResponse<any>> {
        const url = `${this.businessDataUrl}/${id}`;
        return this.processHttpResponse(this.httpClient.delete(url));
    }

    queryAllBusinessData(): Observable<ServerResponse<any>> {
        return this.processHttpResponse(this.httpClient.get(`${this.businessDataUrl}`));
    }

    updateBusinessData(resourceName: string, data: FormData): Observable<ServerResponse<any>> {
        return this.processHttpResponse(this.httpClient.post(`${this.businessDataUrl}` + '/' + resourceName, data));
    }
}
