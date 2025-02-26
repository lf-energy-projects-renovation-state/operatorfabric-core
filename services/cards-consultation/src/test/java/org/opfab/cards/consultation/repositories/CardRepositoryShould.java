/* Copyright (c) 2018-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

package org.opfab.cards.consultation.repositories;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.opfab.cards.consultation.TestUtilities;
import org.opfab.cards.consultation.application.IntegrationTestApplication;
import org.opfab.cards.consultation.model.*;
import org.opfab.users.model.ComputedPerimeter;
import org.opfab.users.model.CurrentUserWithPerimeters;
import org.opfab.users.model.RightEnum;
import org.opfab.users.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import reactor.test.StepVerifier;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.function.Predicate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.opfab.cards.consultation.TestUtilities.createSimpleCard;
import static org.opfab.cards.consultation.TestUtilities.prepareCard;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = IntegrationTestApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CardRepositoryShould {

    public static final String LOGIN = "admin";
    private static Instant now = Instant.now();
    private static Instant nowPlusOne = now.plus(1, ChronoUnit.HOURS);
    private static Instant nowPlusTwo = now.plus(2, ChronoUnit.HOURS);
    private static Instant nowPlusThree = now.plus(3, ChronoUnit.HOURS);
    private static Instant nowMinusOne = now.minus(1, ChronoUnit.HOURS);
    private static Instant nowMinusTwo = now.minus(2, ChronoUnit.HOURS);
    private static Instant nowMinusThree = now.minus(3, ChronoUnit.HOURS);

    @Autowired
    private CardRepository repository;

    private CurrentUserWithPerimeters rteUserEntity1, rteUserEntity2, adminUser;

    public CardRepositoryShould() {
        ComputedPerimeter perimeter = new ComputedPerimeter();
        perimeter.setProcess("PROCESS");
        perimeter.setState("anyState");
        perimeter.setRights(RightEnum.ReceiveAndWrite);

        User user1 = new User();
        user1.setLogin("operator3");
        user1.setFirstName("Test");
        user1.setLastName("User");
        List<String> groups = new ArrayList<>();
        groups.add("rte");
        groups.add("operator");
        user1.setGroups(groups);
        List<String> entities1 = new ArrayList<>();
        entities1.add("entity1");
        user1.setEntities(entities1);
        rteUserEntity1 = new CurrentUserWithPerimeters();
        rteUserEntity1.setUserData(user1);
        rteUserEntity1.setComputedPerimeters(Arrays.asList(perimeter));

        User user2 = new User();
        user2.setLogin("operator3");
        user2.setFirstName("Test");
        user2.setLastName("User");
        List<String> groups2 = new ArrayList<>();
        groups2.add("rte");
        groups2.add("operator");
        user2.setGroups(groups2);
        List<String> entities2 = new ArrayList<>();
        entities2.add("entity2");
        user2.setEntities(entities2);
        rteUserEntity2 = new CurrentUserWithPerimeters();
        rteUserEntity2.setUserData(user2);

        User user3 = new User();
        user3.setLogin("admin");
        user3.setFirstName("Test");
        user3.setLastName("User");
        ;
        adminUser = new CurrentUserWithPerimeters();
        adminUser.setUserData(user3);
        adminUser.setComputedPerimeters(Arrays.asList(perimeter));
    }

    @AfterEach
    public void clean() {
        repository.deleteAll().subscribe();
    }

    private void assertCard(CardOperation op, Object processName, Object publisher, Object processVersion) {
        assertThat(op.card().getId()).isEqualTo(processName);
        assertThat(op.card().getPublisher()).isEqualTo(publisher);
        assertThat(op.card().getProcessVersion()).isEqualTo(processVersion);
    }

    private void persistCard(Card simpleCard) {
        StepVerifier.create(repository.save(simpleCard))
                .expectNextCount(1)
                .expectComplete()
                .verify();
    }

    @Test
    void persistCard() {
        Card card = Card.builder()
                .processInstanceId("PROCESS_ID")
                .process("PROCESS")
                .publisher("PUBLISHER")
                .processVersion("0")
                .state("anyState")
                .startDate(Instant.now())
                .severity(SeverityEnum.ALARM)
                .title(new I18n("title", null))
                .summary(new I18n("summary", null))
                .entityRecipients(new ArrayList<String>(Arrays.asList("entity1", "entity2")))
                .build();
        prepareCard(card, Instant.now());
        StepVerifier.create(repository.save(card))
                .expectNextMatches(computeCardPredicate(card))
                .expectComplete()
                .verify();

        StepVerifier.create(repository.findById("PROCESS.PROCESS_ID"))
                .expectNextMatches(computeCardPredicate(card))
                .expectComplete()
                .verify();
    }

    @Test
    void getZeroCardInRange() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, LOGIN, null, null));
        persistCard(createSimpleCard("3", now, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(null, nowMinusThree, nowMinusTwo, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .expectComplete()
                .verify();
    }

    @Test
    void getTwoCardsInRange() {
        persistCard(createSimpleCard("1", nowMinusOne, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", nowMinusOne, now, nowPlusTwo, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowMinusOne, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusOne, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getThreeCardsInRange() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, LOGIN, null, null));
        persistCard(createSimpleCard("3", now, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS3", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getTwoCardsInRangeWithNoEnd() {
        persistCard(createSimpleCard("1", nowMinusOne, nowMinusOne, nowPlusThree, LOGIN, null, null));
        persistCard(createSimpleCard("2", nowMinusOne, nowMinusOne, null, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowMinusOne, nowPlusOne, null, LOGIN, null, null));

        HashMap<String, CardOperation> results = new HashMap<String, CardOperation>();
        StepVerifier.create(repository.getCardOperations(null, now, nowPlusTwo, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    results.put(op.card().getProcessInstanceId(), op);
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    results.put(op.card().getProcessInstanceId(), op);
                })
                .expectComplete()
                .verify();
        CardOperation card1 = results.get("PROCESS1");
        CardOperation card2 = results.get("PROCESS3");
        assertCard(card1, "PROCESS.PROCESS1", "PUBLISHER", "0");
        assertCard(card2, "PROCESS.PROCESS3", "PUBLISHER", "0");

    }

    @Test
    void getTwoCardsInRangeWithoutStart() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", nowMinusTwo, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("3", now, nowMinusTwo, nowMinusOne, LOGIN, null, null));

        HashMap<String, CardOperation> results = new HashMap<String, CardOperation>();
        StepVerifier.create(repository.getCardOperations(null, null, nowMinusOne, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    results.put(op.card().getProcessInstanceId(), op);
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    results.put(op.card().getProcessInstanceId(), op);
                })
                .expectComplete()
                .verify();
        CardOperation card1 = results.get("PROCESS2");
        CardOperation card2 = results.get("PROCESS3");
        assertCard(card1, "PROCESS.PROCESS2", "PUBLISHER", "0");
        assertCard(card2, "PROCESS.PROCESS3", "PUBLISHER", "0");

    }

    @Test
    void getTwoCardsInRangeWithoutEnd() {
        persistCard(createSimpleCard("1", nowMinusOne, nowMinusOne, now, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, nowPlusOne, nowPlusTwo, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowPlusOne, nowMinusTwo, nowMinusOne, LOGIN, null, null));

        HashMap<String, CardOperation> results = new HashMap<String, CardOperation>();
        StepVerifier.create(repository.getCardOperations(null, nowPlusOne, null, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    results.put(op.card().getProcessInstanceId(), op);
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    results.put(op.card().getProcessInstanceId(), op);
                })
                .expectComplete()
                .verify();
        CardOperation card1 = results.get("PROCESS2");
        CardOperation card2 = results.get("PROCESS3");
        assertCard(card1, "PROCESS.PROCESS2", "PUBLISHER", "0");
        assertCard(card2, "PROCESS.PROCESS3", "PUBLISHER", "0");

    }

    @Test
    void getZeroCardAfterPublishDate() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", nowPlusTwo, now, nowPlusTwo, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowPlusTwo, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(nowPlusThree, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .expectComplete()
                .verify();
    }

    @Test
    void getTwoCardsAfterPublishDate() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", nowPlusTwo, now, nowPlusTwo, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowPlusTwo, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(nowPlusOne, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS3", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getOneCardInRangeAndAfterPublishDate() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", nowPlusOne, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowPlusOne, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(nowPlusOne, nowPlusTwo, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS3", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getOneCardWithPublishDateInRange() {
        persistCard(createSimpleCard("1", nowMinusOne, nowPlusTwo, nowPlusThree, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, nowPlusTwo, nowPlusThree, LOGIN, null, null));
        persistCard(createSimpleCard("3", nowPlusTwo, nowPlusTwo, nowPlusThree, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(nowMinusThree, now, nowPlusOne, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();
    }

    @Test
    void getNoCardAsRteUserEntity1IsNotAdminUser() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, LOGIN, null, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, rteUserEntity1, null)
                .doOnNext(TestUtilities::logCardOperation))
                .expectComplete()
                .verify();
    }

    @Test
    void getNoCardAsAdminUserIsNotInGroupRteOrInGroupOperator() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, null, new String[] { "rte", "operator" }, null));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, null, new String[] { "rte", "operator" }, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .expectComplete()
                .verify();
    }

    @Test
    void getTwoCardAsRteUserEntity1IsInGroupRte() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, null, new String[] { "rte", "operator" }, null));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, null, new String[] { "rte", "operator" }, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, rteUserEntity1, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();
    }

    @Test
    void getNoCardAsRteUserEntity1IsInGroupRteButNotInEntity2() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, null, new String[] { "rte", "operator" },
                new String[] { "entity2" }));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, null, new String[] { "rte", "operator" },
                new String[] { "entity2" }));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, rteUserEntity1, null)
                .doOnNext(TestUtilities::logCardOperation))
                .expectComplete()
                .verify();
    }

    @Test
    void getTwoCardAsRteUserEntity1IsInGroupRteAndInEntity1() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, null, new String[] { "rte", "operator" },
                new String[] { "entity1" }));
        persistCard(createSimpleCard("2", now, now, nowPlusTwo, null, new String[] { "rte", "operator" },
                new String[] { "entity1" }));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, rteUserEntity1, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                })
                .expectComplete()
                .verify();
    }

    @Test
    void getTwoCardsWithOneAcknowledge() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, nowPlusTwo, nowPlusThree, LOGIN, null, null, new String[] { "admin" },
                null, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenAcknowledged()).isFalse();
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenAcknowledged()).isTrue();
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getTwoCardsWithNoneAcknowledgeAsCardsHasNotBeenAcknowledgeByCurrentUser() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null, new String[] { "user1", "user2" },
                null, null));
        persistCard(createSimpleCard("2", now, nowPlusTwo, nowPlusThree, LOGIN, null, null,
                new String[] { "dummyuser" }, null, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenAcknowledged()).isFalse();
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenAcknowledged()).isFalse();
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getTwoCardsWithOneRead() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null));
        persistCard(createSimpleCard("2", now, nowPlusTwo, nowPlusThree, LOGIN, null, null, null,
                new String[] { "admin" }, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenRead()).isFalse();
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenRead()).isTrue();
                })
                .expectComplete()
                .verify();

    }

    @Test
    void getTwoCardsWithNoneReadAsCardsHasNotBeenReadByCurrentUser() {
        persistCard(createSimpleCard("1", now, now, nowPlusOne, LOGIN, null, null, null,
                new String[] { "user1", "user2" }, null));
        persistCard(createSimpleCard("2", now, nowPlusTwo, nowPlusThree, LOGIN, null, null, null,
                new String[] { "dummyuser" }, null));

        StepVerifier.create(repository.getCardOperations(null, now, nowPlusThree, adminUser, null)
                .doOnNext(TestUtilities::logCardOperation))
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS1", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenRead()).isFalse();
                })
                .assertNext(op -> {
                    assertThat(op.card()).isNotNull();
                    assertCard(op, "PROCESS.PROCESS2", "PUBLISHER", "0");
                    assertThat(op.card().getHasBeenRead()).isFalse();
                })
                .expectComplete()
                .verify();

    }

    private Predicate<Card> computeCardPredicate(Card card) {
        Predicate<Card> predicate = c -> card.getId().equals(c.getId());
        predicate = predicate.and(c -> "PUBLISHER".equals(c.getPublisher()));
        predicate = predicate.and(c -> c.getEntityRecipients().size() == 2);
        predicate = predicate.and(c -> c.getEntityRecipients().get(0).equals("entity1"));
        predicate = predicate.and(c -> c.getEntityRecipients().get(1).equals("entity2"));
        return predicate;
    }

}
