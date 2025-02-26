/* Copyright (c) 2018-2025 RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

package org.opfab.cards.consultation.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.opfab.cards.consultation.TestUtilities;
import org.opfab.cards.consultation.application.IntegrationTestApplication;
import org.opfab.cards.consultation.configuration.CustomScreenDataFields;
import org.opfab.cards.consultation.model.CardOperation;
import org.opfab.cards.consultation.repositories.CardRepository;
import org.opfab.cards.consultation.services.CardSubscriptionService;
import org.opfab.users.model.ComputedPerimeter;
import org.opfab.users.model.CurrentUserWithPerimeters;
import org.opfab.users.model.RightEnum;
import org.opfab.users.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.opfab.cards.consultation.TestUtilities.createSimpleCard;
import static org.opfab.cards.consultation.TestUtilities.roundingToMillis;


@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = {IntegrationTestApplication.class, CardSubscriptionService.class, CardOperationsController
   .class, CustomScreenDataFields.class})
class CardOperationsControllerShould {
    private static String TEST_ID = "testClient";

    private static Instant now = roundingToMillis(Instant.now());
    private static Instant nowPlusOne = now.plus(1, ChronoUnit.HOURS);
    private static Instant nowPlusTwo = now.plus(2, ChronoUnit.HOURS);
    private static Instant nowPlusThree = now.plus(3, ChronoUnit.HOURS);
    private static Instant nowMinusOne = now.minus(1, ChronoUnit.HOURS);
    private static Instant nowMinusTwo = now.minus(2, ChronoUnit.HOURS);
    private static Instant nowMinusThree = now.minus(3, ChronoUnit.HOURS);

    @Autowired
    private CardOperationsController controller;
    @Autowired
    private CardSubscriptionService service;
    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private CardRepository repository;

    private CurrentUserWithPerimeters currentUserWithPerimeters, userForUserAckAndReadTest;

    public CardOperationsControllerShould(){
        ComputedPerimeter perimeter = new ComputedPerimeter();
        perimeter.setProcess("PROCESS");
        perimeter.setState("anyState");
        perimeter.setRights(RightEnum.ReceiveAndWrite);

        User user = new User();
        user.setLogin("dummyUser");
        user.setFirstName("Test");
        user.setLastName("User");
        List<String> groups = new ArrayList<>();
        groups.add("rte");
        groups.add("operator");
        user.setGroups(groups);
        List<String> entities = new ArrayList<>();
        entities.add("entity1");
        entities.add("entity2");
        user.setEntities(entities);
        currentUserWithPerimeters = new CurrentUserWithPerimeters();
        currentUserWithPerimeters.setUserData(user);
        currentUserWithPerimeters.setComputedPerimeters(Arrays.asList(perimeter));
        
        user = new User();
        user.setLogin("operator3");
        user.setFirstName("Test2");
        user.setLastName("User2");
        groups = new ArrayList<>();
        groups.add("rte");
        groups.add("operator");
        user.setGroups(groups);
        entities = new ArrayList<>();
        entities.add("entity1");
        entities.add("entity2");
        user.setEntities(entities);
        userForUserAckAndReadTest = new CurrentUserWithPerimeters();
        userForUserAckAndReadTest.setUserData(user);
        userForUserAckAndReadTest.setComputedPerimeters(Arrays.asList(perimeter));
    }

    @AfterEach
    public void clean() {
        repository.deleteAll().subscribe();
    }

    @BeforeEach
    public void initCardData() {
        service.clearSubscriptions();
        StepVerifier.create(repository.deleteAll()).expectComplete().verify();
        int processNo = 0;
        //create past cards
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowMinusTwo, nowMinusOne, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"},
                                                             new String[]{"operator3","some-operator"}, new String[]{"operator3","some-operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowMinusTwo, nowMinusOne, "operator3", new String[]{"rte","operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowMinusOne, now, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"},
                                                             new String[]{"any-operator","some-operator"}, new String[]{"any-operator","some-operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        //create future cards
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, now, nowPlusOne, "operator3", new String[]{"rte","operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowPlusOne, nowPlusTwo, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"})))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowPlusTwo, nowPlusThree, "operator3", new String[]{"rte","operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();

        //card starts in past and ends in future
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowMinusThree, nowPlusThree, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"})))
                .expectNextCount(1)
                .expectComplete()
                .verify();

        //card starts in past and never ends
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowMinusThree, null, "operator3", new String[]{"rte","operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();

        //card starts in future and never ends
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowMinusThree, nowPlusThree, null, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"})))
                .expectNextCount(1)
                .expectComplete()
                .verify();

        //create later published cards in past
        //this one overrides first
        StepVerifier.create(repository.save(createSimpleCard(1, nowMinusOne, nowMinusTwo, nowMinusOne, "operator3", new String[]{"rte","operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowPlusOne, nowMinusTwo, nowMinusOne, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"})))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        //create later published cards in future
        // this one overrides businessconfig
        StepVerifier.create(repository.save(createSimpleCard(3, nowPlusOne, nowPlusOne, nowPlusTwo, "operator3", new String[]{"rte","operator"}, null)))
                .expectNextCount(1)
                .expectComplete()
                .verify();
        StepVerifier.create(repository.save(createSimpleCard(processNo++, nowPlusOne, nowPlusTwo, nowPlusThree, "operator3", new String[]{"rte","operator"}, new String[]{"entity1","entity2"})))
                .expectNextCount(1)
                .expectComplete()
                .verify();
    }

    @Test
    void receiveOlderCards() {
        Flux<String> publisher = controller.registerSubscriptionAndPublish(Mono.just(
                CardOperationsGetParameters.builder()
                        .currentUserWithPerimeters(currentUserWithPerimeters)
                        .clientId(TEST_ID)
                        .test(false)
                        .rangeStart(now)
                        .rangeEnd(nowPlusThree)
                        .notification(false).build()
        ));
        HashMap<String,CardOperation> results = new HashMap<String,CardOperation>();
        StepVerifier.FirstStep<CardOperation> verifier = StepVerifier
                        .create(publisher.map(s -> TestUtilities.readCardOperation(mapper, s))
                                        .doOnNext(TestUtilities::logCardOperation));
        for (int i = 0; i < 8; i++)
                verifier.assertNext(op -> {
                        assertThat(op.card()).isNotNull();
                        results.put(op.card().getProcessInstanceId(), op);
                });
        verifier.expectComplete().verify();

        CardOperation card2 = results.get("PROCESS2");
        CardOperation card3 = results.get("PROCESS3");
        CardOperation card4 = results.get("PROCESS4");
        CardOperation card5 = results.get("PROCESS5");
        CardOperation card6 = results.get("PROCESS6");
        CardOperation card8 = results.get("PROCESS8");
        CardOperation card9 = results.get("PROCESS9");
        CardOperation card10 = results.get("PROCESS10");

        assertThat(card2.card().getId()).isEqualTo("PROCESS.PROCESS2");
        assertThat(card2.card().getPublishDate()).isEqualTo(nowMinusThree);
        assertThat(card3.card().getId()).isEqualTo("PROCESS.PROCESS3");
        assertThat(card3.card().getPublishDate()).isEqualTo(nowPlusOne);
        assertThat(card4.card().getId()).isEqualTo("PROCESS.PROCESS4");
        assertThat(card4.card().getPublishDate()).isEqualTo(nowMinusThree);
        assertThat(card5.card().getId()).isEqualTo("PROCESS.PROCESS5");
        assertThat(card5.card().getPublishDate()).isEqualTo(nowMinusThree);
        assertThat(card6.card().getId()).isEqualTo("PROCESS.PROCESS6");
        assertThat(card6.card().getPublishDate()).isEqualTo(nowMinusThree);
        assertThat(card8.card().getId()).isEqualTo("PROCESS.PROCESS8");
        assertThat(card8.card().getPublishDate()).isEqualTo(nowMinusThree);
        assertThat(card9.card().getId()).isEqualTo("PROCESS.PROCESS9");
        assertThat(card9.card().getPublishDate()).isEqualTo(nowPlusOne);
        assertThat(card10.card().getId()).isEqualTo("PROCESS.PROCESS10");
        assertThat(card10.card().getPublishDate()).isEqualTo(nowPlusOne);

    }

    @Test
    void receiveCardsCheckUserAcks() {
        Flux<String> publisher = controller.registerSubscriptionAndPublish(Mono.just(
                CardOperationsGetParameters.builder()
                        .currentUserWithPerimeters(userForUserAckAndReadTest)
                        .clientId(TEST_ID)
                        .rangeStart(nowMinusThree)
                        .rangeEnd(nowPlusOne)
                        .test(false)
                        .notification(false).build()
        ));
        List<CardOperation> list = publisher.map(s -> TestUtilities.readCardOperation(mapper, s))
        		.filter(co -> Arrays.asList("PROCESS.PROCESS0","PROCESS.PROCESS2","PROCESS.PROCESS4").contains(co.card().getId()))
        		.collectSortedList((co1,co2) -> co1.card().getId().compareTo(co2.card().getId()))
    	.block();
        
		assertThat(list.get(0).card().getId()).isEqualTo("PROCESS.PROCESS0");
        assertThat(list.get(0).card().getHasBeenAcknowledged()).isTrue();
        assertThat(list.get(1).card().getId()).isEqualTo("PROCESS.PROCESS2");
        assertThat(list.get(1).card().getHasBeenAcknowledged()).isFalse();
        assertThat(list.get(2).card().getId()).isEqualTo("PROCESS.PROCESS4");
        assertThat(list.get(2).card().getHasBeenAcknowledged()).isFalse();
    }
    
    @Test
    void receiveCardsCheckUserReads() {
        Flux<String> publisher = controller.registerSubscriptionAndPublish(Mono.just(
                CardOperationsGetParameters.builder()
                        .currentUserWithPerimeters(userForUserAckAndReadTest)
                        .clientId(TEST_ID)
                        .rangeStart(nowMinusThree)
                        .rangeEnd(nowPlusOne)
                        .test(false)
                        .notification(false).build()
        ));
        
        List<CardOperation> list = publisher.map(s -> TestUtilities.readCardOperation(mapper, s))
        		.filter(co -> Arrays.asList("PROCESS.PROCESS0","PROCESS.PROCESS2","PROCESS.PROCESS4").contains(co.card().getId()))
        		.collectSortedList((co1,co2) -> co1.card().getId().compareTo(co2.card().getId()))
    	.block();
        
		assertThat(list.get(0).card().getId()).isEqualTo("PROCESS.PROCESS0");
        assertThat(list.get(0).card().getHasBeenRead()).isTrue();
        assertThat(list.get(1).card().getId()).isEqualTo("PROCESS.PROCESS2");
        assertThat(list.get(1).card().getHasBeenRead()).isFalse();
        assertThat(list.get(2).card().getId()).isEqualTo("PROCESS.PROCESS4");
        assertThat(list.get(2).card().getHasBeenRead()).isFalse();
    }

 

}
