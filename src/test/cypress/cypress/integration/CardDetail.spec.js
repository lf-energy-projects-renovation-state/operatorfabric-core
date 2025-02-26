/* Copyright (c) 2021-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

/* This test file focuses on some state-type specific behaviour in card details header. As the Cypress test suite grows,
it might make sense to merge it with other tests.
* */
import {OpfabGeneralCommands} from '../support/opfabGeneralCommands';
import {FeedCommands} from '../support/feedCommands';
import {ScriptCommands} from '../support/scriptCommands';

describe('Card detail', function () {
    const opfab = new OpfabGeneralCommands();
    const feed = new FeedCommands();
    const script = new ScriptCommands();

    before('Set up configuration', function () {
        // This can stay in a `before` block rather than `beforeEach` as long as the test does not change configuration
        script.resetUIConfigurationFiles();
        script.deleteAllSettings();
        script.loadTestConf();
        script.deleteAllCards();
        script.deleteAllArchivedCards();
        script.sendCard('cypress/cardDetail/cardDetail.json');
    });

    describe('Check card detail', function () {
        it(`Check card detail`, function () {
            opfab.loginWithUser('operator1_fr');
            feed.openFirstCard();

            // Check  user context values
            cy.get('#userContext-login').contains(/^operator1_fr$/); // use ^ and $ to have a contains exactly
            cy.get('#userContext-token').contains('eyJhb');
            cy.get('#userContext-firstName').contains(/^John$/);
            cy.get('#userContext-lastName').contains(/^Doe$/);
            cy.get('#userContext-groups').contains(/^Maintainer,Dispatcher$/);
            cy.get('#userContext-entities').contains(/^ENTITY_FR,ENTITY1_FR$/);

            // Check opfab API  calls
            cy.get('#opfab-users-entities-getEntityName').contains('Control Center FR North');
            cy.get('#opfab-users-entities-getEntityName-unknownEntity').contains('unknownEntity');
            cy.get('#opfab-currentCard-isUserAllowedToRespond').contains('true');
            cy.get('#opfab-currentCard-isUserMemberOfAnEntityRequiredToRespond').contains('true');
            cy.get('#opfab-currentCard-getEntitiesUsableForUserResponse').contains(/^ENTITY1_FR$/);
            cy.get('#opfab-currentCard-getDisplayContext').contains(/^realtime$/);
            cy.get('#opfab-users-entities-getAllEntities').contains(
                'entity[0]:id=ENTITY1_FR,name=Control Center FR North,description=Control Center FR North,roles=ACTIVITY_AREA,CARD_RECEIVER,CARD_SENDER,parents=ENTITY_FR,labels=FR1 label'
            );
            cy.get('#opfab-users-entities-getAllEntities').contains(
                'entity[1]:id=ENTITY2_FR,name=Control Center FR South,description=Control Center FR South,roles=ACTIVITY_AREA,CARD_RECEIVER,CARD_SENDER,parents=ENTITY_FR,labels=undefined'
            );
            cy.get('#opfab-users-entities-getAllEntities').contains(
                'entity[2]:id=ENTITY3_FR,name=Control Center FR East,description=Control Center FR East,roles=ACTIVITY_AREA,CARD_RECEIVER,CARD_SENDER,parents=ENTITY_FR,labels=undefined'
            );
            cy.get('#opfab-users-entities-getAllEntities').contains(
                'entity[3]:id=ENTITY4_FR,name=Control Center FR West,description=Control Center FR West,roles=ACTIVITY_AREA,CARD_RECEIVER,CARD_SENDER,parents=ENTITY_FR,labels=undefined'
            );
            cy.get('#opfab-users-entities-getAllEntities').contains(
                'entity[4]:id=ENTITY_FR,name=French Control Centers,description=French Control Centers,roles=ACTIVITY_AREA_GROUP,CARD_RECEIVER,parents=undefined,labels=undefined'
            );
            cy.get('#opfab-users-entities-getAllEntities').contains(
                'entity[6]:id=IT_SUPERVISOR_ENTITY,name=IT SUPERVISION CENTER,description=IT SUPERVISION CENTER,roles=ACTIVITY_AREA,CARD_RECEIVER,CARD_SENDER,parents=EUROPEAN_SUPERVISION_CENTERS,labels=undefined'
            );
            cy.get('#opfab-users-entities-getEntity-ENTITY1_FR').contains(
                /^ENTITY1_FR,Control Center FR North,Control Center FR North,ACTIVITY_AREA,CARD_RECEIVER,CARD_SENDER,ENTITY_FR,FR1 label$/
            );
            cy.get('#screenSize').contains('md');
            cy.get('#opfab-currentCard-onTemplateRenderingComplete').contains('ok');

            // see card in full screen
            cy.get('#opfab-card-detail-fullscreen-button').click();
            cy.get('#screenSize').contains('lg');
            // go back in standard screen
            cy.get('#opfab-card-detail-fullscreen-button').click();
            cy.get('#screenSize').contains('md');

            // handlebars templating
            cy.get('#handlebars-simpleData').contains(/^test$/);
            cy.get('#handlebars-if').contains(/^ok$/);
            cy.get('#handlebars-each').contains(/^123$/);

            // external css
            cy.get('#external-text').should('have.css', 'color', 'rgb(119, 119, 119)');
            // Check card detail footer contains card reception date and time and not contains 'Addressed to' (because operator1_fr is member of only one entity)
            cy.get('.opfab-card-received-footer').contains(
                /Received : \d{2}\/\d{2}\/\d{4} at ((1[0-2]|0?[1-9]):([0-5]\d) ([AP]M))/
            );
            cy.get('#opfab-card-details-address-to').should('not.exist');

            cy.get('#severityColor').contains('#1074ad');
        });

        it(`Check card footer for operator4_fr (member of several entities)`, function () {
            opfab.loginWithUser('operator4_fr');
            feed.openFirstCard();

            // Check card detail footer contains card reception date and time and contains 'Addressed to' with user entities to which the card was sent
            cy.get('.opfab-card-received-footer').contains(
                /Received : \d{2}\/\d{2}\/\d{4} at ((1[0-2]|0?[1-9]):([0-5]\d) ([AP]M))/
            );
            cy.get('#opfab-card-details-address-to').contains('Control Center FR North');
            cy.get('#opfab-card-details-address-to').contains('Control Center FR South');
        });

        it(`Check card detail spinner when simulating card processed `, function () {
            opfab.loginWithUser('operator1_fr');
            feed.openFirstCard();
            cy.get('#opfabAPI-display-spinner-button').click();
            opfab.checkLoadingSpinnerIsDisplayed();
            opfab.checkLoadingSpinnerIsNotDisplayed();
        });

        it(`Check card detail in archives`, function () {
            opfab.loginWithUser('operator1_fr');
            opfab.navigateToArchives();
            // We click the search button
            cy.get('#opfab-archives-logging-btn-search').click();

            // Click on the card
            cy.waitDefaultTime();
            cy.get('#opfab-archives-cards-list').find('.opfab-archive-sev-information').first().click();

            // Check the spinner appears when clicking on the button
            cy.get('#opfabAPI-display-spinner-button').click();
            opfab.checkLoadingSpinnerIsDisplayed();
            opfab.checkLoadingSpinnerIsNotDisplayed();

            // Check  user context values
            cy.get('#userContext-login').contains(/^operator1_fr$/); // use ^ and $ to have a contains exactly
            cy.get('#userContext-token').contains('eyJhb');
            cy.get('#userContext-firstName').contains(/^John$/);
            cy.get('#userContext-lastName').contains(/^Doe$/);
            cy.get('#userContext-groups').contains(/^Maintainer,Dispatcher$/);
            cy.get('#userContext-entities').contains(/^ENTITY_FR,ENTITY1_FR$/);

            cy.get('#opfab-ui-getCurrentVisiblePeriod').contains('Domain = RT');
            cy.get('#opfab-ui-getCurrentVisiblePeriod').contains(/startPeriod = \d{4}\-\d{2}\-\d{2}/);
            cy.get('#opfab-ui-getCurrentVisiblePeriod').contains(/endPeriod = \d{4}\-\d{2}\-\d{2}/);

            // Check opfab API calls
            cy.get('#opfab-users-entities-getEntityName').contains('Control Center FR North');
            cy.get('#opfab-users-entities-getEntityName-unknownEntity').contains('unknownEntity');

            // in archives is isUserAllowedToRespond always return false
            cy.get('#opfab-currentCard-isUserAllowedToRespond').contains('false');

            cy.get('#opfab-currentCard-isUserMemberOfAnEntityRequiredToRespond').contains('true');
            cy.get('#opfab-currentCard-getDisplayContext').contains(/^archive$/);
            cy.get('#screenSize').contains('lg');
            cy.get('#opfab-currentCard-onTemplateRenderingComplete').contains('ok');

            // handlebars templating
            cy.get('#handlebars-simpleData').contains(/^test$/);
            cy.get('#handlebars-if').contains(/^ok$/);
            cy.get('#handlebars-each').contains(/^123$/);

            // Check card detail footer contains card reception date and time and not contains 'Addressed to'
            cy.get('.opfab-card-received-footer').contains(
                /Received : \d{2}\/\d{2}\/\d{4} at ((1[0-2]|0?[1-9]):([0-5]\d) ([AP]M))/
            );
            cy.get('#opfab-card-details-address-to').should('not.exist');
        });

        it(`Check card detail footer for archives for operator4_fr (member of several entities)`, function () {
            opfab.loginWithUser('operator4_fr');
            opfab.navigateToArchives();

            // We click the search button
            cy.get('#opfab-archives-logging-btn-search').click();

            // Click on the card
            cy.waitDefaultTime();
            cy.get('#opfab-archives-cards-list').find('.opfab-archive-sev-information').first().click();

            // Check the spinner appears when clicking on the button
            cy.get('#opfabAPI-display-spinner-button').click();
            opfab.checkLoadingSpinnerIsDisplayed();
            opfab.checkLoadingSpinnerIsNotDisplayed();

            // Check card detail footer contains card reception date and time and not contains 'Addressed to'
            cy.get('.opfab-card-received-footer').contains(
                /Received : \d{2}\/\d{2}\/\d{4} at ((1[0-2]|0?[1-9]):([0-5]\d) ([AP]M))/
            );
            cy.get('#opfab-card-details-address-to').should('not.exist');
        });

        it(`Check opfab API when response not required `, function () {
            script.sendCard('cypress/cardDetail/cardDetailResponseNotRequired.json');
            opfab.loginWithUser('operator1_fr');
            feed.openFirstCard();
            cy.get('#opfab-currentCard-isUserAllowedToRespond').contains('true');
            cy.get('#opfab-currentCard-isUserMemberOfAnEntityRequiredToRespond').contains('false');
        });

        it(`Check opfab API when response is not possible `, function () {
            script.sendCard('cypress/cardDetail/cardDetailResponseNotPossible.json');
            opfab.loginWithUser('operator1_fr');
            feed.openFirstCard();
            cy.get('#opfab-currentCard-isUserAllowedToRespond').contains('false');
            cy.get('#opfab-currentCard-isUserMemberOfAnEntityRequiredToRespond').contains('false');
        });

        it(`Check that a spinner is displayed when the card takes time to load `, function () {
            script.sendCard('cypress/cardDetail/cardDetailResponseNotPossible.json');
            cy.delayRequestResponse('/cards-consultation/cards/**');
            opfab.loginWithUser('operator1_fr');
            cy.get('of-light-card').eq(0).click();
            opfab.checkLoadingSpinnerIsDisplayed();
            opfab.checkLoadingSpinnerIsNotDisplayed();
        });

        it(`Check deleted card detail footer in archives`, function () {
            script.sendCard('cypress/userCard/message.json');
            opfab.loginWithUser('operator1_fr');
            feed.openFirstCard();
            feed.deleteCurrentCard();

            opfab.navigateToArchives();

            // We click the search button
            cy.get('#opfab-archives-logging-btn-search').click();

            // Click on the card
            cy.waitDefaultTime();
            cy.get('#opfab-archives-cards-list').find('.opfab-archive-sev-information').first().click();

            // Check card detail footer contains card reception date
            cy.get('.opfab-card-received-footer').contains(
                /Received : \d{2}\/\d{2}\/\d{4} at ((1[0-2]|0?[1-9]):([0-5]\d) ([AP]M))/
            );
            // Check card detail footer contains card deletion date
            cy.get('.opfab-card-received-footer').contains(
                /Deleted or updated : \d{2}\/\d{2}\/\d{4} at ((1[0-2]|0?[1-9]):([0-5]\d) ([AP]M))/
            );
        });

        it(`Check showCard link`, function () {
            script.sendCard('cypress/userCard/message.json');
            script.sendCard('cypress/cardDetail/cardDetail.json');

            opfab.loginWithUser('operator1_fr');

            feed.openFirstCard();
            cy.hash().should('eq', '#/feed/cards/cypress.kitchenSink');

            // We click on show card link
            cy.get('#showCardLink').click();

            cy.hash().should('eq', '#/feed/cards/defaultProcess.process1');
            cy.get('#opfab-div-card-template-processed').contains(
                'Hello operator1_fr, you received the following message'
            );
        });

        it(`Check show alert message links`, function () {
            script.sendCard('cypress/cardDetail/cardDetail.json');

            opfab.loginWithUser('operator1_fr');

            feed.openFirstCard();
            cy.hash().should('eq', '#/feed/cards/cypress.kitchenSink');

            cy.get('#showDebugMessage').click();
            cy.get('#opfab-alert-detail-msg').contains('Debug message');
            cy.get('#opfab-alert-detail-msg').should('have.css', 'background-color', 'rgb(0, 112, 218)');
            cy.get('.opfab-alert-close').click();

            cy.get('#showInfoMessage').click();
            cy.get('#opfab-alert-detail-msg').contains('Info message');
            cy.get('#opfab-alert-detail-msg').should('have.css', 'background-color', 'rgb(103, 168, 84)');
            cy.get('.opfab-alert-close').click();

            cy.get('#showErrorMessage').click();
            cy.get('#opfab-alert-detail-msg').contains('Error message');
            cy.get('#opfab-alert-detail-msg').should('have.css', 'background-color', 'rgb(232, 122, 8)');
            cy.get('.opfab-alert-close').click();

            cy.get('#showAlarmMessage').click();
            cy.get('#opfab-alert-detail-msg').contains('Alarm message');
            cy.get('#opfab-alert-detail-msg').should('have.css', 'background-color', 'rgb(167, 26, 26)');
            cy.get('.opfab-alert-close').click();
        });

        it(`Check getCards API call`, function () {
            script.sendCard('cypress/userCard/message.json');
            script.sendCard('cypress/cardDetail/cardDetail.json');

            opfab.loginWithUser('operator1_fr');

            feed.openFirstCard();
            cy.hash().should('eq', '#/feed/cards/cypress.kitchenSink');

            cy.get('#opfabGetCardsResult').contains('"numberOfElements":1');
            cy.get('#opfabGetCardsResult').contains('"_id":"defaultProcess.process1"');
            cy.get('#opfabGetCardsResult').contains('"titleTranslated":"Message"');
        });

        it(`Check isUserAllowedToEdit and editCard API call`, function () {
            script.sendCard('defaultProcess/message.json');
            opfab.loginWithUser('operator1_fr');

            feed.openFirstCard();
            cy.hash().should('eq', '#/feed/cards/defaultProcess.process1');

            // check allowed user can use the edit button to edit card
            cy.get('#opfab-div-card-template-processed').find('#editButton').eq(0).should('contain.text', 'Edit');
            cy.get('#opfab-div-card-template-processed').find('#editButton').eq(0).click();

            cy.get('of-usercard').should('exist');
            cy.get('#opfab-usercard-btn-cancel').click();

            opfab.logout();

            opfab.loginWithUser('operator3_fr');

            feed.openFirstCard();
            cy.hash().should('eq', '#/feed/cards/defaultProcess.process1');

            // check user not allowed to edit does not see the edit button
            cy.get('#opfab-div-card-template-processed').should('exist');
            cy.get('#editButton').should('not.be.visible');
        });
    });
});
