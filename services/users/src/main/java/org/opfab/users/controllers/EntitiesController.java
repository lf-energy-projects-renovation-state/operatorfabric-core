/* Copyright (c) 2018-2022, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */



package org.opfab.users.controllers;

import org.opfab.springtools.error.model.ApiError;
import org.opfab.springtools.error.model.ApiErrorException;
import org.opfab.users.model.Entity;
import org.opfab.users.model.EntityData;
import org.opfab.users.model.UserData;
import org.opfab.users.repositories.EntityRepository;
import org.opfab.users.repositories.UserRepository;
import org.opfab.users.services.UserService;
import org.opfab.users.utils.EntityCycleDetector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;


/**
 * GroupsController, documented at {@link EntitiesApi}
 *
 */
@RestController
@RequestMapping("/entities")
public class EntitiesController implements EntitiesApi {

    public static final String ENTITY_NOT_FOUND_MSG = "Entity %s not found";
    public static final String USER_NOT_FOUND_MSG = "User %s not found";
    public static final String BAD_USER_LIST_MSG = "Bad user list : user %s not found";
    public static final String NO_MATCHING_ENTITY_ID_MSG = "Payload Entity id does not match URL Entity id";
    @Autowired
    private EntityRepository entityRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserService userService;


    @Override
    public Void addEntityUsers(HttpServletRequest request, HttpServletResponse response, String id, List<String> users) throws Exception {

        //Only existing entities can be updated
        findEntityOrThrow(id);

        //Retrieve users from repository for users list, throwing an error if a login is not found
        List<UserData> foundUsers = retrieveUsers(users);

        for (UserData userData : foundUsers) {
            userData.addEntity(id);
            userService.publishUpdatedUserMessage(userData.getLogin());
        }
        userRepository.saveAll(foundUsers);
        return null;
    }

    @Override
    public Entity createEntity(HttpServletRequest request, HttpServletResponse response, Entity entity) throws Exception {
        userService.checkFormatOfIdField(entity.getId());

        if (entityRepository.findById(entity.getId()).orElse(null) == null) {
            response.addHeader("Location", request.getContextPath() + "/entities/" + entity.getId());
            response.setStatus(201);
        }
        this.checkForCycleInEntityParenthood(entity);
        userService.publishUpdatedConfigMessage();
        return entityRepository.save((EntityData) entity);
    }

    synchronized void checkForCycleInEntityParenthood(Entity current) {
        List<Entity> entities = entityRepository.findAll().stream().map(Entity.class::cast).collect(Collectors.toList());
        EntityCycleDetector cycleChecker = new EntityCycleDetector(current,entities);
        cycleChecker.throwApiExceptionOnCycle();
    }

    @Override
    public Void deleteEntityUsers(HttpServletRequest request, HttpServletResponse response, String id) throws Exception {

        //Only existing entities can be updated
         findEntityOrThrow(id);

        //We delete the links between the users who are part of the entity to delete, and the entity
        removeTheReferenceToTheEntityForMemberUsers(id);
        userService.publishUpdatedConfigMessage();
        return null;
    }

    @Override
    public Void deleteEntityUser(HttpServletRequest request, HttpServletResponse response, String id, String login) throws Exception {

        //Only existing entities can be updated
        findEntityOrThrow(id);

        //Retrieve users from repository for users list, throwing an error if a login is not found
        UserData foundUser = userRepository.findById(login).orElseThrow(()->new ApiErrorException(
                ApiError.builder()
                        .status(HttpStatus.NOT_FOUND)
                        .message(String.format(USER_NOT_FOUND_MSG, login))
                        .build()
        ));

        if (foundUser != null) {
            foundUser.deleteEntity(id);
            userRepository.save(foundUser);
            userService.publishUpdatedUserMessage(foundUser.getLogin());
        }
        return null;
    }

    @Override
    public List<Entity> fetchEntities(HttpServletRequest request, HttpServletResponse response) throws Exception {
        return entityRepository.findAll().stream().map(Entity.class::cast).collect(Collectors.toList());
    }

    @Override
    public Entity fetchEntity(HttpServletRequest request, HttpServletResponse response, String id) throws Exception {
        return entityRepository.findById(id).orElseThrow(
           ()-> new ApiErrorException(
              ApiError.builder()
                 .status(HttpStatus.NOT_FOUND)
                 .message(String.format(ENTITY_NOT_FOUND_MSG, id))
                 .build()
           )
        );
    }

    @Override
    public Entity updateEntity(HttpServletRequest request, HttpServletResponse response, String id, Entity entity) throws Exception {
        //id from entity body parameter should match id path parameter
        if (!entity.getId().equals(id)) {
            throw new ApiErrorException(
                    ApiError.builder()
                            .status(HttpStatus.BAD_REQUEST)
                            .message(NO_MATCHING_ENTITY_ID_MSG)
                            .build());
        } else {
            return createEntity(request, response, entity);
        }
    }

    @Override
    public Void updateEntityUsers(HttpServletRequest request, HttpServletResponse response, String id, List<String> users) throws Exception {

        //Only existing entities can be updated
        findEntityOrThrow(id);

        List<UserData> formerlyBelongs = userRepository.findByEntitiesContaining(id);
        List<String> newUsersInEntity = new ArrayList<>(users);

        //Make sure the intended updated users list only contains logins existing in the repository, throwing an error if this is not the case
        retrieveUsers(users);

        List<UserData> toUpdate =
                formerlyBelongs.stream()
                        .filter(u->!users.contains(u.getLogin()))
                        .peek(u-> {
                            u.deleteEntity(id);
                            newUsersInEntity.remove(u.getLogin());
                            //Send a user config change event for all users that are updated because they're removed from the entity
                            userService.publishUpdatedUserMessage(u.getLogin());
                        }).collect(Collectors.toList());

        userRepository.saveAll(toUpdate);
        addEntityUsers(request, response, id, newUsersInEntity); //For users that are added to the entity, the event will be published by addEntityUsers.
        return null;
    }

    @Override
    public Void deleteEntity(HttpServletRequest request, HttpServletResponse response, String id) throws Exception {

        // Only existing entity can be deleted
        EntityData foundEntityData = findEntityOrThrow(id);

        // First we have to delete the links between the users who are part of the entity to delete, and the entity
        removeTheReferenceToTheEntityForMemberUsers(id);

        removeTheReferenceToTheEntityForChildEntities(id);

        // Then we can delete the entity
        entityRepository.delete(foundEntityData);
        userService.publishUpdatedConfigMessage();
        return null;
    }

    // Remove the link between the entity and all its members (this link is in "user" mongo collection)
    private void removeTheReferenceToTheEntityForMemberUsers(String idEntity) {
        List<UserData> foundUsers = userRepository.findByEntitiesContaining(idEntity);

        if (foundUsers != null && !foundUsers.isEmpty()) {
            for (UserData userData : foundUsers) {
                userData.deleteEntity(idEntity);
                userService.publishUpdatedUserMessage(userData.getLogin());
            }
            userRepository.saveAll(foundUsers);
        }
    }

    // Remove the link between the entity and all its child entities
    private void removeTheReferenceToTheEntityForChildEntities(String idEntity) {
        List<EntityData> foundChilds = entityRepository.findByParentsContaining(idEntity);
        for (EntityData childData : foundChilds) {
            List<String> parents = childData.getParents();
            parents.remove(idEntity);
            childData.setParents(parents);
        }
        entityRepository.saveAll(foundChilds);
    }
    

    private EntityData findEntityOrThrow(String id) {
        return entityRepository.findById(id).orElseThrow(
                ()-> new ApiErrorException(
                        ApiError.builder()
                                .status(HttpStatus.NOT_FOUND)
                                .message(String.format(ENTITY_NOT_FOUND_MSG, id))
                                .build()
                ));
    }

/** Retrieve users from repository for logins list, throwing an error if a login is not found
 * */
    private List<UserData> retrieveUsers(List<String> logins) {

        List<UserData> foundUsers = new ArrayList<>();
        for(String login : logins){
            UserData foundUser = userRepository.findById(login).orElseThrow(
                    () -> new ApiErrorException(
                            ApiError.builder()
                                    .status(HttpStatus.BAD_REQUEST)
                                    .message(String.format(BAD_USER_LIST_MSG, login))
                                    .build()
                    ));
            foundUsers.add(foundUser);
        }

        return foundUsers;
    }
}
