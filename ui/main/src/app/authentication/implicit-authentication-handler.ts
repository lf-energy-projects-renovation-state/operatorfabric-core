/* Copyright (c) 2023-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {AuthConfig, EventType as OAuthType, JwksValidationHandler, OAuthEvent, OAuthService} from 'angular-oauth2-oidc';
import {AuthenticatedUser} from './auth.model';
import {AuthHandler} from './auth-handler';
import {HttpClient} from '@angular/common/http';
import {CurrentUserStore} from 'app/business/store/current-user.store';
import {LoggerService} from 'app/business/services/logs/logger.service';
import {ConfigService} from 'app/business/services/config.service';

export class ImplicitAuthenticationHandler extends AuthHandler {
    constructor(
        httpClient: HttpClient,
        private oauthService: OAuthService
    ) {
        super(httpClient);
    }

    public async initializeAuthentication() {
        const authConfig: AuthConfig = {
            issuer: this.delegateUrl,
            redirectUri: this.getRedirectUri(),
            silentRefreshRedirectUri: this.getRedirectUri() + 'silent-refresh.html',
            clientId: this.clientId,
            scope: 'openid profile email',
            showDebugInformation: false,
            sessionChecksEnabled: false,
            clearHashAfterLogin: false,
            requireHttps: false
        };
        const postLogoutUrl = ConfigService.getConfigValue('security.implicit-mode-post-logout-url');
        if (postLogoutUrl) {
            authConfig.postLogoutRedirectUri = postLogoutUrl;
        }

        this.oauthService.configure(authConfig);
        this.oauthService.setupAutomaticSilentRefresh();
        this.oauthService.tokenValidationHandler = new JwksValidationHandler();
        await this.oauthService.loadDiscoveryDocument().then(() => {
            this.login();
        });
        this.oauthService.events.subscribe((e) => {
            this.dispatchOAuth2Events(e);
        });
    }

    private getRedirectUri(): string {
        return `${location.origin}${location.pathname}`;
    }

    private async login() {
        await this.oauthService.tryLogin().then(() => {
            if (this.oauthService.hasValidAccessToken()) {
                this.setUserAuthenticated();
                this.updateAfterSilentRefresh();
            } else {
                sessionStorage.setItem('flow', 'implicit');
                this.oauthService.initImplicitFlow();
            }
        });
    }

    // hack to update token as silent refresh updates the token in background
    // we need to update regularly as we do not catch when refresh is done
    updateAfterSilentRefresh() {
        setInterval(() => {
            const token = this.oauthService.getAccessToken();
            const expirationDate = new Date(this.oauthService.getAccessTokenExpiration());
            localStorage.setItem('token', token);
            localStorage.setItem('expirationDate', expirationDate?.getTime().toString());
            CurrentUserStore.setToken(token);
        }, 5000);
    }

    private setUserAuthenticated() {
        const user = new AuthenticatedUser();
        const identityClaims = this.oauthService.getIdentityClaims();
        user.login = identityClaims['sub'];
        user.token = this.oauthService.getAccessToken();
        user.expirationDate = new Date(this.oauthService.getAccessTokenExpiration());
        this.userAuthenticated.next(user);
    }

    private dispatchOAuth2Events(event: OAuthEvent) {
        const eventType: OAuthType = event.type;
        switch (eventType) {
            // We can have a token_error or token_refresh_error when it is not possible to refresh token
            // This case arise for example when using a SSO and the session is not valid anymore (session timeout)
            case 'token_error':
            case 'token_refresh_error':
                this.tokenWillSoonExpire.next(true);
                this.tokenExpired.next(true);
                break;
            case 'logout': {
                LoggerService.info('Logout from implicit flow');
                break;
            }
        }
    }

    public logout() {
        this.oauthService.logOut();
    }
}
