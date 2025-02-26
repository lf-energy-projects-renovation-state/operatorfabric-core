/* Copyright (c) 2018-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Observable, Subject} from 'rxjs';
import {Group} from '@ofServices/groups/model/Group';
import {takeUntil, tap, map} from 'rxjs/operators';
import {GroupsServer} from './server/GroupsServer';
import {ServerResponseStatus} from '../../server/ServerResponse';
import {LoggerService} from 'app/services/logs/LoggerService';
import {AlertMessageService} from '@ofServices/alerteMessage/AlertMessageService';
import {MessageLevel} from '@ofServices/alerteMessage/model/Message';

export class GroupsService {
    private static _groups: Group[];
    private static groupsServer: GroupsServer;

    private static readonly ngUnsubscribe$ = new Subject<void>();

    public static setGroupsServer(groupsServer: GroupsServer) {
        GroupsService.groupsServer = groupsServer;
    }

    public static deleteById(id: string) {
        return GroupsService.groupsServer.deleteById(id).pipe(
            tap((groupsResponse) => {
                if (groupsResponse.status === ServerResponseStatus.OK) {
                    GroupsService.deleteFromCachedGroups(id);
                } else {
                    LoggerService.error(`Error while deleting group ${id} :  ${groupsResponse.statusMessage}`);
                    AlertMessageService.sendAlertMessage({
                        message: '',
                        i18n: {key: 'shared.error.group.deleteGroup'},
                        level: MessageLevel.ERROR
                    });
                }
            })
        );
    }

    private static deleteFromCachedGroups(id: string): void {
        GroupsService._groups = GroupsService._groups.filter((group) => group.id !== id);
    }

    private static updateCachedGroups(groupData: Group): void {
        const updatedGroups = GroupsService._groups.filter((group) => group.id !== groupData.id);
        updatedGroups.push(groupData);
        GroupsService._groups = updatedGroups;
    }

    private static queryAllGroups(): Observable<Group[]> {
        return GroupsService.groupsServer.queryAllGroups().pipe(
            map((groupsResponse) => {
                if (groupsResponse.status === ServerResponseStatus.OK) {
                    return groupsResponse.data;
                } else {
                    LoggerService.error(`Error while getting groups :  ${groupsResponse.statusMessage}`);
                    AlertMessageService.sendAlertMessage({
                        message: '',
                        i18n: {key: 'shared.error.group.gettingGroups'},
                        level: MessageLevel.ERROR
                    });
                    return [];
                }
            })
        );
    }

    public static loadAllGroupsData(): Observable<any> {
        return GroupsService.queryAllGroups().pipe(
            takeUntil(GroupsService.ngUnsubscribe$),
            tap({
                next: (groups) => {
                    if (groups) {
                        GroupsService._groups = groups;
                        LoggerService.info('List of groups loaded');
                    }
                },
                error: (error) => LoggerService.error('an error occurred when loading groups' + error)
            })
        );
    }

    public static getGroups(): Group[] {
        return GroupsService._groups;
    }

    public static getGroup(groupId): Group {
        const group = GroupsService._groups.find((group) => group.id === groupId);
        return group;
    }

    public static getCachedValues(): Array<Group> {
        return GroupsService.getGroups();
    }

    public static updateGroup(groupData: Group): Observable<Group> {
        return GroupsService.groupsServer.updateGroup(groupData).pipe(
            map((groupsResponse) => {
                if (groupsResponse.status === ServerResponseStatus.OK) {
                    GroupsService.updateCachedGroups(groupData);
                    return groupsResponse.data;
                } else {
                    LoggerService.error(
                        `Error while updating group ${groupData.id} :  ${groupsResponse.statusMessage}`
                    );
                    AlertMessageService.sendAlertMessage({
                        message: '',
                        i18n: {key: 'shared.error.group.updateGroup'},
                        level: MessageLevel.ERROR
                    });
                    return null;
                }
            })
        );
    }

    public static getGroupName(idGroup: string): string {
        const found = GroupsService._groups.find((group) => group.id === idGroup);
        if (found?.name) return found.name;

        return idGroup;
    }

    public static getAll(): Observable<any[]> {
        return GroupsService.queryAllGroups();
    }

    public static update(data: any): Observable<any> {
        return GroupsService.updateGroup(data);
    }
}
