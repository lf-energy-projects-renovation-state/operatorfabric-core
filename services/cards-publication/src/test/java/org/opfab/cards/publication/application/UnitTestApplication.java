/* Copyright (c) 2018-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */



package org.opfab.cards.publication.application;

import org.opfab.cards.publication.configuration.CustomScreenDataFields;
import org.opfab.useractiontracing.UserActionLogsConfiguration;
import org.opfab.useractiontracing.mongo.UserActionLogRepositoryImpl;
import org.opfab.cards.publication.kafka.CardObjectMapper;
import org.opfab.cards.publication.kafka.card.CardCommandFactory;
import org.opfab.cards.publication.kafka.producer.ResponseCardProducer;
import org.opfab.cards.publication.mocks.CardRepositoryMock;
import org.opfab.cards.publication.services.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.opfab.test.EventBusSpy;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;
import org.opfab.cards.publication.configuration.json.JacksonConfig;
import org.opfab.cards.publication.configuration.Common;
import org.opfab.cards.publication.configuration.ExternalRecipients;
import org.opfab.cards.publication.configuration.Services;
import org.opfab.cards.publication.controllers.CardController;

import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import({CardNotificationService.class,
     ExternalAppService.class , ResponseCardProducer.class
, CardCommandFactory.class, CardObjectMapper.class, JacksonConfig.class
, Common.class , CardController.class, 
ExternalRecipients.class, UserActionLogsConfiguration.class, UserActionLogRepositoryImpl.class, EventBusSpy.class,
        CardRepositoryMock.class,Services.class, CustomScreenDataFields.class})
public class UnitTestApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext ctx = SpringApplication.run(UnitTestApplication.class, args);
        assert (ctx != null);
        ctx.getBeanProvider(Jackson2ObjectMapperBuilder
           .class);
    }

}
