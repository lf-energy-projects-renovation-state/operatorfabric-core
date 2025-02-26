/* Copyright (c) 2018-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */



package org.opfab.cards.model;

/**
 * Define the kind of the card sender
 * <dl>
 *     <dt>EXTERNAL</dt><dd>The sender is an external service</dd>
 *     <dt>ENTITY</dt><dd>The sender of the card is a user on behalf of the entity</dd>
 *     <dt>USER</dt><dd>The sender of the card is the user himself</dd>
 * </dl>
 * Note : This enum is created by hand because Swagger can't handle enums. It should match the corresponding enum definition in the Cards API.
 *
 */
public enum PublisherTypeEnum {
    EXTERNAL,
    ENTITY,
    USER
}
