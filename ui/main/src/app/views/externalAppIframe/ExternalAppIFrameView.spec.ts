/* Copyright (c) 2023-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {ConfigServerMock} from '@tests/mocks/configServer.mock';
import {ServerResponse, ServerResponseStatus} from 'app/server/ServerResponse';
import {ConfigService} from 'app/services/config/ConfigService';
import {GlobalStyleService} from '@ofServices/style/global-style.service';
import {firstValueFrom} from 'rxjs';
import {ExternalAppIFrameView} from './ExternalAppIFrameView';
import {NavigationService} from '@ofServices/navigation/NavigationService';
import {ApplicationRouterMock} from '@tests/mocks/applicationRouter.mock';

describe('ExternalAppIFrame view ', () => {
    let externalAppIFrameView: ExternalAppIFrameView;
    const menuConf = {
        navigationBar: [
            {
                id: 'menu1',
                label: 'title.single',
                entries: [
                    {
                        customMenuId: 'entry1',
                        url: 'https://test/',
                        label: 'entry.single',
                        linkType: 'BOTH'
                    },
                    {
                        customMenuId: 'entry2',
                        url: 'https://test/question?param=myparam',
                        label: 'entry.single',
                        linkType: 'BOTH'
                    }
                ]
            }
        ]
    };

    beforeEach(async () => {
        const configServerMock = new ConfigServerMock();
        ConfigService.setConfigServer(configServerMock);
        GlobalStyleService.init();
        GlobalStyleService.setStyle(GlobalStyleService.DAY);
        configServerMock.setResponseForMenuConfiguration(new ServerResponse(menuConf, ServerResponseStatus.OK, null));
        await firstValueFrom(ConfigService.loadUiMenuConfig());
        // Mock method not supported in test context
        history.replaceState = () => {};
        externalAppIFrameView = new ExternalAppIFrameView();
        NavigationService.setApplicationRouter(new ApplicationRouterMock());
    });

    // menu1/entry1 ==> https://test/ ==> https://test/?opfab_theme=DAY
    it('GIVEN a menu is configured WHEN menu route is send THEN url is set with opfab_theme  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry1/');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/?opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // menu1/entry2/ ==> https://test/question?param=myparam ==> https://test/question?param=myparam&opfab_theme=DAY
    it('GIVEN menu is configure with a parameter in url  WHEN route is send THEN url is set with the parameter and opfab_theme  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry2/');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/question?param=myparam&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // menu1/entry2 ==> https://test/question?param=myparam ==> https://test/question?param=myparam&opfab_theme=DAY
    //
    it('GIVEN menu is configure with a parameter in url without /  WHEN route is send THEN url is set with the parameter and opfab_theme ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry2');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/question?param=myparam&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // If a business application is called form a card, it can be called with parameters
    // To do that, in the card the window.location is set with the url #/businessconfigparty/menu_id/menuItem_id/
    // then is is possible to add params to the url
    // For example: #/businessconfigparty/menu_id/menuItem_id/?myparam=param1&myotherparam=param2
    //
    // The user will be redirected to the url configured + the parameters
    //
    // menu1/entry1/?my_param=param&my_param2=param2 ==> https://test/ ==> https://test/?my_param=param&my_param2=param2&opfab_theme=DAY
    it('GIVEN menu is configure WHEN route is send with params THEN url is set with the params and with opfab_theme  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry1/?my_param=param&my_param2=param2');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/?my_param=param&my_param2=param2&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // If a business application is called form a card, it can be called with parameters
    // To do that, in the card the window.location is set with the url #/businessconfigparty/menu_id/menuItem_id
    // then is is possible to add params to the url
    // For example: #/businessconfigparty/menu_id/menuItem_id?myparam=param1&myotherparam=param2
    //
    // The user will be redirected to the url configured + the parameters
    //
    // menu1/entry1?my_param=param&my_param2=param2 ==> https://test/ ==> https://test/?my_param=param&my_param2=param2&opfab_theme=DAY
    //
    it('GIVEN menu is configure WHEN route is send with params without / THEN url is set with the params and with opfab_theme', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry1/?my_param=param&my_param2=param2');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/?my_param=param&my_param2=param2&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // WARNING : HACK
    //
    // When user makes a reload (for example via F5) or use a bookmark link, the browser encodes what is after #
    // if user makes a second reload, the browser encodes again the encoded link
    // and after if user reload again, this time it is not encoded anymore by the browser
    // So it ends up with 3 possible links: a none encoded link, an encoded link or a twice encoding link
    // and we have no way to know which one it is when processing the url
    //
    // To solve the problem we encode two times the url before giving it to the browser
    // so we always have a unique case : a double encoded url

    it('GIVEN menu is configure WHEN route is send with params and encoded twice THEN url is decoded set with the params and with opfab_theme  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry1/%253Fmy_param=param&my_param2=param2');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/?my_param=param&my_param2=param2&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // menu1/entry2/?my_param2=param2 ==> https://test/question?param=myparam ==> https://test/question?my_param=param&my_param2=param2&opfab_theme=DAY
    it('GIVEN menu is configure with a parameter in url WHEN route is send with params THEN url is set with all the params and with opfab_theme  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry2/?my_param2=param2');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/question?param=myparam&my_param2=param2&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    // menu1/entry1/deep/deep2/query?my_param=param ==> https://test/ ==> https://test/deepurl/deepurl2/query?my_param=param&opfab_theme=DAY
    it('GIVEN menu is configure WHEN route is send with deep link and a param THEN url is set with deep link , the param and opfab_theme  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry1/deep/deep2/query?my_param=param');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/deep/deep2/query?my_param=param&opfab_theme=DAY');
        externalAppIFrameView.destroy();
    });

    it('GIVEN an url is set  WHEN global style change THEN url is set with new style  ', async () => {
        NavigationService.navigateTo('/businessconfigparty/entry1');
        const url = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(url).toEqual('https://test/?opfab_theme=DAY');

        GlobalStyleService.setStyle(GlobalStyleService.NIGHT);
        const newUrl = await firstValueFrom(externalAppIFrameView.getExternalAppUrl());

        expect(newUrl).toEqual('https://test/?opfab_theme=NIGHT');
        externalAppIFrameView.destroy();
    });
});
