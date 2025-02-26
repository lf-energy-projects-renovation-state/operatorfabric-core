/* Copyright (c) 2022-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

package org.opfab.users.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.opfab.users.model.EntityCreationReport;
import org.opfab.users.model.Group;
import org.opfab.users.model.OperationResult;
import org.opfab.users.model.Perimeter;
import org.opfab.users.model.User;
import org.opfab.users.repositories.GroupRepository;
import org.opfab.users.repositories.PerimeterRepository;
import org.opfab.users.repositories.UserRepository;
import org.opfab.users.utils.IdFormatChecker;

public class GroupsService {

    private static final String GROUP_NOT_FOUND_MSG = "Group %s not found";
    private static final String GROUP_ALREADY_EXISTS = "Group with name %s already exists";
    private static final String BAD_USER_LIST_MSG = "Bad user list : user %s not found";
    private static final String BAD_PERIMETER_LIST_MSG = "Bad perimeter list : perimeter %s not found";
    private static final String USER_NOT_FOUND_MSG = "User %s not found";

    private GroupRepository groupRepository;
    private UserRepository userRepository;
    private PerimeterRepository perimeterRepository;
    private NotificationService notificationService;

    public GroupsService(GroupRepository groupRepository, UserRepository userRepository,
            PerimeterRepository perimeterRepository, NotificationService notificationService) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.perimeterRepository = perimeterRepository;
        this.notificationService = notificationService;
    }

    public List<Group> fetchGroups() {
        return groupRepository.findAll();
    }

    public OperationResult<Group> fetchGroup(String groupId) {
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isPresent())
            return new OperationResult<>(group.get(), true, null, null);
        else
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));
    }

    public OperationResult<EntityCreationReport<Group>> createGroup(Group group) {
        IdFormatChecker.IdCheckResult formatCheckResult = IdFormatChecker.check(group.getId());
        if (formatCheckResult.isValid()) {
            OperationResult<List<Perimeter>> foundPerimetersResult = getPerimeters(group.getPerimeters());
            synchronized (this) {
                List<Group> groups = groupRepository.findAll();
                if (groups.stream().filter(o -> !group.getId().equals(o.getId())).anyMatch(o -> group.getName().equals(o.getName()))){
                    return new OperationResult<>(null, false, OperationResult.ErrorType.BAD_REQUEST,
                            String.format(GROUP_ALREADY_EXISTS, group.getName()));
                }
            }
            if (foundPerimetersResult.isSuccess()) {
                boolean isAlreadyExisting = groupRepository.findById(group.getId()).isPresent();
                Group newGroup = groupRepository.save(group);

                if (group.getUsers() != null) {
                    updateGroupUsers(newGroup.getId(), group.getUsers());
                }
                notificationService.publishUpdatedGroupMessage(group.getId());
                EntityCreationReport<Group> report = new EntityCreationReport<>(isAlreadyExisting, newGroup);
                return new OperationResult<>(report, true, null, null);
            } else
                return new OperationResult<>(null, false, foundPerimetersResult.getErrorType(),
                        foundPerimetersResult.getErrorMessage());
        } else
            return new OperationResult<>(null, false, OperationResult.ErrorType.BAD_REQUEST,
                    formatCheckResult.getErrorMessage());

    }

    private OperationResult<List<Perimeter>> getPerimeters(List<String> perimeterIds) {
        List<Perimeter> foundPerimeters = new ArrayList<>();
        for (String perimeter : perimeterIds) {
            Optional<Perimeter> foundPerimeter = perimeterRepository.findById(perimeter);
            if (foundPerimeter.isEmpty())
                return new OperationResult<>(null, false, OperationResult.ErrorType.BAD_REQUEST,
                        String.format(BAD_PERIMETER_LIST_MSG, perimeter));
            else
                foundPerimeters.add(foundPerimeter.get());
        }
        return new OperationResult<>(foundPerimeters, true, null, null);
    }

    public OperationResult<String> deleteGroup(String groupId) {
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));

        removeTheReferenceToTheGroupForMemberUsers(groupId);

        groupRepository.delete(group.get());
        return new OperationResult<>(null, true, null, null);
    }

    // Remove the link between the group and all its members (this link is in "user"
    // mongo collection)
    private void removeTheReferenceToTheGroupForMemberUsers(String idGroup) {
        List<User> foundUsers = userRepository.findByGroupSetContaining(idGroup);
        if (foundUsers != null && !foundUsers.isEmpty()) {
            for (User userData : foundUsers) {
                userData.deleteGroup(idGroup);
                userRepository.save(userData);
                notificationService.publishUpdatedUserMessage(userData.getLogin());
            }
        }
    }

    public OperationResult<String> addGroupUsers(String groupId, List<String> users) {
        if (!groupRepository.findById(groupId).isPresent())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));

        OperationResult<List<User>> foundUsersResult = retrieveUsers(users);
        if (foundUsersResult.isSuccess()) {
            List<User> foundUsers = foundUsersResult.getResult();
            for (User userData : foundUsers) {
                userData.addGroup(groupId);
                userRepository.save(userData);
                notificationService.publishUpdatedUserMessage(userData.getLogin());
            }
        } else
            return new OperationResult<>(null, false, foundUsersResult.getErrorType(),
                    foundUsersResult.getErrorMessage());
        return new OperationResult<>(null, true, null, groupId);
    }

    public OperationResult<String> updateGroupUsers(String groupId, List<String> users) {
        if (!groupRepository.findById(groupId).isPresent())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));
        OperationResult<List<User>> foundUsersResult = retrieveUsers(users);
        if (foundUsersResult.isSuccess()) {
            List<User> formerlyBelongs = userRepository.findByGroupSetContaining(groupId);
            formerlyBelongs.forEach(user -> {
                if (!users.contains(user.getLogin())) {
                    user.deleteGroup(groupId);
                    userRepository.save(user);
                    notificationService.publishUpdatedUserMessage(user.getLogin());
                }
            });
            addGroupUsers(groupId, users);
        } else
            return new OperationResult<>(null, false, foundUsersResult.getErrorType(),
                    foundUsersResult.getErrorMessage());

        return new OperationResult<>(null, true, null, null);
    }

    private OperationResult<List<User>> retrieveUsers(List<String> logins) {
        List<User> foundUsers = new ArrayList<>();
        for (String login : logins) {
            Optional<User> foundUser = userRepository.findById(login);
            if (foundUser.isEmpty())
                return new OperationResult<>(null, false, OperationResult.ErrorType.BAD_REQUEST,
                        String.format(BAD_USER_LIST_MSG, login));
            else
                foundUsers.add(foundUser.get());
        }
        return new OperationResult<>(foundUsers, true, null, null);
    }

    public OperationResult<String> deleteGroupUsers(String groupId) {
        if (!groupRepository.findById(groupId).isPresent())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));
        removeTheReferenceToTheGroupForMemberUsers(groupId);
        return new OperationResult<>(null, true, null, groupId);
    }

    public OperationResult<String> deleteGroupUser(String groupId, String login) {

        if (!groupRepository.findById(groupId).isPresent())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));

        Optional<User> foundUser = userRepository.findById(login);

        if (foundUser.isEmpty()) {
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(USER_NOT_FOUND_MSG, login));
        }

        foundUser.get().deleteGroup(groupId);
        userRepository.save(foundUser.get());
        notificationService.publishUpdatedUserMessage(foundUser.get().getLogin());

        return new OperationResult<>(null, true, null, "");
    }

    public OperationResult<List<Perimeter>> fetchGroupPerimeters(String groupId) {
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));
        List<String> perimetersId = group.get().getPerimeters();
        if (perimetersId != null)
            return getPerimeters(perimetersId);
        List<Perimeter> emptyList = new ArrayList<>();
        return new OperationResult<>(emptyList, true, null, null);
    }

    public OperationResult<String> updateGroupPerimeters(String groupId, List<String> perimeters) {
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));
        OperationResult<List<Perimeter>> result = getPerimeters(perimeters);
        if (!result.isSuccess())
            return new OperationResult<>(null, false, result.getErrorType(),
                    result.getErrorMessage());
        Group updatedGroup = group.get();
        updatedGroup.setPerimeters(perimeters);
        groupRepository.save(updatedGroup);
        notificationService.publishUpdatedGroupMessage(groupId);
        return new OperationResult<>(null, true, null, null);
    }

    public OperationResult<String> addGroupPerimeters(String groupId, List<String> perimetersToAdd) {
        Optional<Group> group = groupRepository.findById(groupId);
        if (group.isEmpty())
            return new OperationResult<>(null, false, OperationResult.ErrorType.NOT_FOUND,
                    String.format(GROUP_NOT_FOUND_MSG, groupId));

        OperationResult<List<Perimeter>> result = getPerimeters(perimetersToAdd);
        if (!result.isSuccess())
            return new OperationResult<>(null, false, result.getErrorType(),
                    result.getErrorMessage());
        Group updatedGroup = group.get();
        List<String> newPerimeters = new  ArrayList<>(updatedGroup.getPerimeters());
        for (String perimeter : perimetersToAdd)
            newPerimeters.add(perimeter);
        updatedGroup.setPerimeters(newPerimeters);
        groupRepository.save(updatedGroup);
        notificationService.publishUpdatedGroupMessage(groupId);
        return new OperationResult<>(null, true, null, null);
    }

}
