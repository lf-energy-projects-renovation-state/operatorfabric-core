/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {ReplaySubject, Observable, Subject} from 'rxjs';

export class CurrentUserStore {
    private static readonly connectionEvent = new ReplaySubject<string>(1);
    private static readonly sessionWillSoonExpireEvent = new Subject<boolean>();
    private static readonly sessionExpiredEvent = new Subject<boolean>();
    private static token: string;
    private static authenticationUsesToken = false;

    public static getCurrentUserLogin(): Observable<string> {
        return this.connectionEvent.asObservable();
    }

    public static setSessionWillSoonExpire() {
        this.sessionWillSoonExpireEvent.next(true);
    }

    public static getSessionWillSoonExpire(): Observable<boolean> {
        return this.sessionWillSoonExpireEvent.asObservable();
    }

    public static setSessionExpired() {
        this.sessionExpiredEvent.next(true);
    }

    public static getSessionExpired(): Observable<boolean> {
        return this.sessionExpiredEvent.asObservable();
    }

    public static setCurrentUserAuthenticationValid(login: string) {
        this.connectionEvent.next(login);
    }

    public static setToken(token: string) {
        this.token = token;
    }

    public static getToken(): string {
        return this.token;
    }

    public static setAuthenticationUsesToken() {
        this.authenticationUsesToken = true;
    }

    public static doesAuthenticationUseToken(): boolean {
        return this.authenticationUsesToken;
    }
}
