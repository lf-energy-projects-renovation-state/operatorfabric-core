/* Copyright (c) 2021-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {OpfabGeneralCommands} from '../support/opfabGeneralCommands';
import {ArchivesAndLoggingCommands} from '../support/archivesAndLoggingCommands';
import {ScriptCommands} from '../support/scriptCommands';

describe('Archives screen tests', function () {
    const opfab = new OpfabGeneralCommands();
    const archivesAndLogging = new ArchivesAndLoggingCommands();
    const script = new ScriptCommands();

    before('Set up configuration', function () {
        script.loadTestConf();
        script.cleanDownloadsDir();
    });

    after('Clean export directory', function () {
        script.cleanDownloadsDir();
    });

    it('Check archived cards reception', function () {
        script.deleteAllArchivedCards();
        script.send6TestCards();
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();
        cy.waitDefaultTime();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxDoesNotExist();
        archivesAndLogging.checkSeeAllCardsLinkDoesNotExist();
        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(6);
        archivesAndLogging.checkNoCardDetailIsDisplayed();
        checkPaginationResultsNumberIs(6);

        // We check filtering by process is working
        archivesAndLogging.selectProcess('IGCC');
        archivesAndLogging.clickOnSearchButton();
        archivesAndLogging.checkNoResultForSearch();
        archivesAndLogging.clickOnResetButton();
        archivesAndLogging.selectProcess('Process example');
        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(6);

        // We check filtering by state is working
        archivesAndLogging.selectState('Message', 1);
        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(1);
        archivesAndLogging.clickOnResetButton();

        // We delete the test cards, and we check that we still have the corresponding archived cards
        script.deleteAllCards();
        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(6);
        archivesAndLogging.checkNoCardDetailIsDisplayed();
        checkPaginationResultsNumberIs(6);

        script.send6TestCards();
        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(10);

        archivesAndLogging.checkNoCardDetailIsDisplayed();
        checkPaginationResultsNumberIs(12);
    });

    it('Check collapsible update', function () {
        script.deleteAllArchivedCards();
        script.send6TestCards();
        script.send6TestCards();
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();

        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(10);
        checkPaginationResultsNumberIs(12);
        checkNoPlusIconIsDisplayed();
        checkNoMinusIconIsDisplayed();

        clickOnCollapsibleUpdates();
        checkNumberOfLineDisplayedIs(6);
        checkNumberOfPlusIconDisplayedIs(6);
        archivesAndLogging.checkNoCardDetailIsDisplayed();
        checkPaginationResultsNumberIs(6);

        clickOnFirstPlusIcon();
        checkNumberOfLineDisplayedIs(7);
        checkNoPlusIsIconDisplayedOnLineNumber(1);
        checkMinusIconIsDiplayedOnFirstLine();
        checkNoPlusIsIconDisplayedOnLineNumber(2);
        checkNoMinusIsIconDisplayedOnLineNumber(2);

        clickOnFirstMinusIcon();
        checkNoMinusIsIconDisplayedOnLineNumber(1);
        checkNumberOfLineDisplayedIs(6);
        checkNumberOfPlusIconDisplayedIs(6);
    });

    it('Check spinner when request take more than one second', function () {
        delayArchiveRequest();
        script.deleteAllArchivedCards();
        script.send6TestCards();
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();
        cy.waitDefaultTime();
        archivesAndLogging.clickOnSearchButton();
        opfab.checkLoadingSpinnerIsDisplayed();
        opfab.checkLoadingSpinnerIsNotDisplayed();
        checkNumberOfLineDisplayedIs(6);
    });

    it('Check composition of multi-filters for process groups/processes/states for operator1_fr', function () {
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();
        checkMultifiltersWhenAllProcessStatesAreDisplayed();
        // We check this state is not present because it is only a child state
        archivesAndLogging.checkStateSelectDoesNotContains('Planned outage date response');
    });

    it('Check composition of multi-filters for process groups/processes/states for itsupervisor1', function () {
        script.deleteAllArchivedCards();
        script.send6TestCards();
        opfab.loginWithUser('itsupervisor1');
        opfab.navigateToArchives();
        archivesAndLogging.checkSeeAllCardsLinkDoesNotExist();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsDisplayed();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsChecked();

        checkMultifiltersForNotAdminModeForItsupervisor1();

        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(1);

        // We activate the admin mode
        archivesAndLogging.clickSeeOnlyCardsIAmRecipientOfCheckbox();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsNotChecked();

        checkMultifiltersWhenAllProcessStatesAreDisplayed();

        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(6);

        openAndCheckArchiveCardContent(
            'Electricity consumption forecast',
            'Daily electrical consumption forecast',
            'Entity recipients : Control Center FR East, Control Center FR North, Control Center FR South'
        );

        // We deactivate the admin mode
        archivesAndLogging.clickSeeOnlyCardsIAmRecipientOfCheckbox();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsChecked();

        checkMultifiltersForNotAdminModeForItsupervisor1();
    });

    it('Check composition of multi-filters for process groups/processes/states for admin', function () {
        opfab.loginWithUser('admin');
        opfab.navigateToArchives();
        archivesAndLogging.checkProcessGroupSelectDoesNotExist();
        archivesAndLogging.checkProcessSelectDoesNotExist();
        archivesAndLogging.checkStateSelectDoesNotExist();
        archivesAndLogging.checkNoProcessStateMessageIsDisplayed();

        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxDoesNotExist();
        archivesAndLogging.checkSeeAllCardsLinkIsDisplayed();

        // We activate the admin mode
        archivesAndLogging.clickSeeAllCardsLink();

        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsDisplayed();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsNotChecked();

        checkMultifiltersWhenAllProcessStatesAreDisplayed();

        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(6);

        openAndCheckArchiveCardContent('Electricity consumption forecast', 'Daily electrical consumption forecast');

        // We deactivate the admin mode
        archivesAndLogging.clickSeeOnlyCardsIAmRecipientOfCheckbox();

        archivesAndLogging.checkNoProcessStateMessageIsDisplayed();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxDoesNotExist();
        archivesAndLogging.checkSeeAllCardsLinkIsDisplayed();
    });

    it('Check admin mode for operator2_it with VIEW_ALL_CARDS role ', function () {
        opfab.loginWithUser('operator2_fr');
        opfab.navigateToArchives();

        cy.waitDefaultTime();

        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsDisplayed();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxIsChecked();

        archivesAndLogging.clickOnSearchButton();
        checkNumberOfLineDisplayedIs(3);
        // We activate the admin mode
        archivesAndLogging.clickSeeOnlyCardsIAmRecipientOfCheckbox();
        archivesAndLogging.clickOnSearchButton();

        checkNumberOfLineDisplayedIs(6);

        openAndCheckArchiveCardContent(
            '⚠️ NETWORK CONTINGENCIES ⚠️',
            'ASPHL71SIERE',
            'Entity recipients : Control Center FR North'
        );
    });

    it('Check composition of multi-filters for process groups/processes/states for operator1_fr, with a config without process group', function () {
        script.loadEmptyProcessGroups();
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();
        archivesAndLogging.checkProcessGroupSelectDoesNotExist();
        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxDoesNotExist();
        archivesAndLogging.checkSeeAllCardsLinkDoesNotExist();

        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.checkNumberOfProcessEntriesIs(9);
        archivesAndLogging.checkProcessSelectContains('Conference and IT incident');
        archivesAndLogging.checkProcessSelectContains('External recipient');
        archivesAndLogging.checkProcessSelectContains('Message or question');
        archivesAndLogging.checkProcessSelectContains('Task');
        archivesAndLogging.checkProcessSelectContains('Task Advanced');
        archivesAndLogging.checkProcessSelectContains('IGCC');
        archivesAndLogging.checkProcessSelectContains('Process example');
        archivesAndLogging.checkProcessSelectContains('Test process for cypress');
        archivesAndLogging.checkProcessSelectContains('Supervisor');
        archivesAndLogging.selectAllProcesses();
        archivesAndLogging.clickOnProcessSelect();

        archivesAndLogging.clickOnStateSelect();
        archivesAndLogging.selectAllStates();
        archivesAndLogging.checkNumberOfStateSelectedIs(36);
        // We check this state is not present because it is only a child state
        archivesAndLogging.checkStateSelectDoesNotContains('Planned outage date response');

        script.loadTestConf();
    });

    it('Check behaviour of "isOnlyAChildState" attribute (in file config.json of bundles)', function () {
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();

        archivesAndLogging.clickOnProcessGroupSelect();
        archivesAndLogging.selectAllProcessGroups();

        archivesAndLogging.clickOnProcessSelect();
        cy.selectProcess('Process example');
        archivesAndLogging.clickOnProcessSelect();

        archivesAndLogging.clickOnStateSelect();
        archivesAndLogging.checkNumberOfStateEntriesIs(8);
        archivesAndLogging.checkStateSelectContains('Process example');
        archivesAndLogging.checkStateSelectContains('Message');
        archivesAndLogging.checkStateSelectContains('Data quality');
        archivesAndLogging.checkStateSelectContains('Electricity consumption forecast');
        archivesAndLogging.checkStateSelectContains('Action Required');
        archivesAndLogging.checkStateSelectContains('Additional information required');
        archivesAndLogging.checkStateSelectContains('Network Contingencies');
        // 'Planned outage date response' shall not be displayed
        // because 'isOnlyAChildState' attribute is set to true for this state
        archivesAndLogging.checkStateSelectDoesNotContains('Planned outage date response');
    });

    it('Check composition of multi-filters for operator6_fr (no rights on process/state and not member of ADMIN group)', function () {
        opfab.loginWithUser('operator6_fr');
        opfab.navigateToArchives();
        archivesAndLogging.checkProcessGroupSelectDoesNotExist();
        archivesAndLogging.checkProcessSelectDoesNotExist();
        archivesAndLogging.checkStateSelectDoesNotExist();
        archivesAndLogging.checkNoProcessStateMessageIsDisplayed();

        archivesAndLogging.checkSeeOnlyCardsIAmRecipientOfCheckboxDoesNotExist();
        archivesAndLogging.checkSeeAllCardsLinkDoesNotExist();
    });

    it('Check export', function () {
        script.deleteAllArchivedCards();
        script.send6TestCards();
        script.send6TestCards();
        opfab.loginWithUser('operator1_fr');
        opfab.navigateToArchives();
        archivesAndLogging.clickOnSearchButton();

        clickOnCollapsibleUpdates();
        checkNumberOfLineDisplayedIs(6);
        checkNumberOfPlusIconDisplayedIs(6);

        clickOnExportButton();
        cy.waitDefaultTime();

        // check download folder contains the export file
        cy.task('list', {dir: './cypress/downloads'}).then((files) => {
            expect(files.length).to.equal(1);

            // check file name
            expect(files[0]).to.match(/^Archive_export_\d*\.xlsx/);
            // check file content
            cy.task('readXlsx', {file: './cypress/downloads/' + files[0], sheet: 'data'}).then((rows) => {
                expect(rows.length).to.equal(12);

                expect(rows[0]['SEVERITY']).to.equal('Alarm');
                checkPublicationDateForExportRow(rows[0]);
                expect(rows[0]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[0], 1);
                expect(rows[0]['TITLE']).to.equal('⚠️ Network Contingencies ⚠️');
                expect(rows[0]['SUMMARY']).to.equal('Contingencies report for French network');
                expect(rows[0]['SERVICE']).to.equal('Base Examples');
                expect(rows[0]['PROCESS']).to.equal('Process example ');

                expect(rows[1]['SEVERITY']).to.equal('Alarm');
                checkPublicationDateForExportRow(rows[1]);
                expect(rows[1]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[1], 3);
                expect(rows[1]['TITLE']).to.equal('Electricity consumption forecast');
                expect(rows[1]['SUMMARY']).to.equal('Message received');
                expect(rows[1]['SERVICE']).to.equal('Base Examples');
                expect(rows[1]['PROCESS']).to.equal('Process example ');

                expect(rows[2]['SEVERITY']).to.equal('Action');
                checkPublicationDateForExportRow(rows[2]);
                expect(rows[2]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[2], 5);
                expect(rows[2]['TITLE']).to.equal('⚡ Planned Outage');
                expect(rows[2]['SUMMARY']).to.equal('Message received');
                expect(rows[2]['SERVICE']).to.equal('Base Examples');
                expect(rows[2]['PROCESS']).to.equal('Process example ');

                expect(rows[3]['SEVERITY']).to.equal('Compliant');
                checkPublicationDateForExportRow(rows[3]);
                expect(rows[3]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[3], 0);
                expect(rows[3]['TITLE']).to.equal('Process state (calcul)');
                expect(rows[3]['SUMMARY']).to.equal('Message received');
                expect(rows[3]['SERVICE']).to.equal('Base Examples');
                expect(rows[3]['PROCESS']).to.equal('Process example ');

                expect(rows[4]['SEVERITY']).to.equal('Information');
                checkPublicationDateForExportRow(rows[4]);
                expect(rows[4]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[4], 0);
                expect(rows[4]['TITLE']).to.equal('Data quality');
                expect(rows[4]['SUMMARY']).to.equal('Message received');
                expect(rows[4]['SERVICE']).to.equal('Base Examples');
                expect(rows[4]['PROCESS']).to.equal('Process example ');

                expect(rows[5]['SEVERITY']).to.equal('Information');
                checkPublicationDateForExportRow(rows[5]);
                expect(rows[5]['EMITTER']).to.equal('Control Center FR North');
                checkEntityRecipientsCountForExportRow(rows[5], 0);
                expect(rows[5]['TITLE']).to.equal('Message');
                expect(rows[5]['SUMMARY']).to.equal(
                    "Message received : France-England's interconnection is 100% operational / Result of the maintenance is <OK>"
                );
                expect(rows[5]['SERVICE']).to.equal('Base Examples');
                expect(rows[5]['PROCESS']).to.equal('Process example ');

                expect(rows[6]['SEVERITY']).to.equal('Alarm');
                checkPublicationDateForExportRow(rows[6]);
                expect(rows[6]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[6], 1);
                expect(rows[6]['TITLE']).to.equal('⚠️ Network Contingencies ⚠️');
                expect(rows[6]['SUMMARY']).to.equal('Contingencies report for French network');
                expect(rows[6]['SERVICE']).to.equal('Base Examples');
                expect(rows[6]['PROCESS']).to.equal('Process example ');

                expect(rows[7]['SEVERITY']).to.equal('Alarm');
                checkPublicationDateForExportRow(rows[7]);
                expect(rows[7]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[7], 3);
                expect(rows[7]['TITLE']).to.equal('Electricity consumption forecast');
                expect(rows[7]['SUMMARY']).to.equal('Message received');
                expect(rows[7]['SERVICE']).to.equal('Base Examples');
                expect(rows[7]['PROCESS']).to.equal('Process example ');

                expect(rows[8]['SEVERITY']).to.equal('Action');
                checkPublicationDateForExportRow(rows[8]);
                expect(rows[8]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[8], 5);
                expect(rows[8]['TITLE']).to.equal('⚡ Planned Outage');
                expect(rows[8]['SUMMARY']).to.equal('Message received');
                expect(rows[8]['SERVICE']).to.equal('Base Examples');
                expect(rows[8]['PROCESS']).to.equal('Process example ');

                expect(rows[9]['SEVERITY']).to.equal('Compliant');
                checkPublicationDateForExportRow(rows[9]);
                expect(rows[9]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[9], 0);
                expect(rows[9]['TITLE']).to.equal('Process state (calcul)');
                expect(rows[9]['SUMMARY']).to.equal('Message received');
                expect(rows[9]['SERVICE']).to.equal('Base Examples');
                expect(rows[9]['PROCESS']).to.equal('Process example ');

                expect(rows[10]['SEVERITY']).to.equal('Information');
                checkPublicationDateForExportRow(rows[10]);
                expect(rows[10]['EMITTER']).to.equal('publisher_test');
                checkEntityRecipientsCountForExportRow(rows[10], 0);
                expect(rows[10]['TITLE']).to.equal('Data quality');
                expect(rows[10]['SUMMARY']).to.equal('Message received');
                expect(rows[10]['SERVICE']).to.equal('Base Examples');
                expect(rows[10]['PROCESS']).to.equal('Process example ');

                expect(rows[11]['SEVERITY']).to.equal('Information');
                checkPublicationDateForExportRow(rows[11]);
                expect(rows[11]['EMITTER']).to.equal('Control Center FR North');
                checkEntityRecipientsCountForExportRow(rows[11], 0);
                expect(rows[11]['TITLE']).to.equal('Message');
                expect(rows[11]['SUMMARY']).to.equal(
                    "Message received : France-England's interconnection is 100% operational / Result of the maintenance is <OK>"
                );
                expect(rows[11]['SERVICE']).to.equal('Base Examples');
                expect(rows[11]['PROCESS']).to.equal('Process example ');
            });
        });
    });

    function clickOnCollapsibleUpdates() {
        cy.get('#opfab-archives-collapsible-updates').click();
    }

    function checkNumberOfLineDisplayedIs(nb) {
        cy.get('#opfab-archives-cards-list').find('.opfab-archives-table-line').should('have.length', nb);
    }

    function checkNoPlusIconIsDisplayed() {
        cy.get('#opfab-archives-cards-list').find('.opfab-archives-icon-plus').should('not.exist');
    }

    function checkNumberOfPlusIconDisplayedIs(nb) {
        cy.get('#opfab-archives-cards-list').find('.opfab-archives-icon-plus').should('have.length', 6);
    }

    function clickOnFirstPlusIcon() {
        cy.get('#opfab-archives-cards-list').find('.opfab-archives-icon-plus').first().click();
    }

    function checkNoPlusIsIconDisplayedOnLineNumber(nb) {
        cy.get('#opfab-archives-cards-list')
            .find('.opfab-archives-table-line')
            .eq(nb - 1)
            .find('.opfab-archives-icon-plus')
            .should('not.exist');
    }

    function checkNoMinusIconIsDisplayed() {
        cy.get('#opfab-archives-cards-list').find('.opfab-archives-icon-minus').should('not.exist');
    }

    function checkMinusIconIsDiplayedOnFirstLine() {
        cy.get('#opfab-archives-cards-list')
            .find('.opfab-archives-table-line')
            .first()
            .find('.opfab-archives-icon-minus')
            .should('have.length', 1);
    }
    function clickOnFirstMinusIcon() {
        cy.get('#opfab-archives-cards-list').find('.opfab-archives-icon-minus').first().click();
    }

    function checkNoMinusIsIconDisplayedOnLineNumber(nb) {
        cy.get('#opfab-archives-cards-list')
            .find('.opfab-archives-table-line')
            .eq(nb - 1)
            .find('.opfab-archives-icon-minus')
            .should('not.exist');
    }

    function checkPaginationResultsNumberIs(nb) {
        cy.get('#opfab-archive-results-number').should('have.text', ' Results number  : ' + nb + ' ');
    }

    function delayArchiveRequest() {
        cy.intercept('/cards-consultation/archives', (req) => {
            req.reply((res) => {
                res.delay = 2000;
            });
        });
    }

    function clickOnExportButton() {
        cy.get('#opfab-archives-btn-exportToExcel').click();
    }

    function checkPublicationDateForExportRow(row) {
        expect(row['PUBLICATION DATE']).to.match(/^\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/);
    }

    function checkEntityRecipientsCountForExportRow(row, count) {
        if (count === 0) expect(row['ENTITY RECIPIENTS']).to.equal('');
        else expect(row['ENTITY RECIPIENTS'].split(', ').length).to.equal(count);
    }

    function openAndCheckArchiveCardContent(cellContent, cardText, entityRecipientsFooterText = '') {
        cy.get('#opfab-archives-cards-list').find('td').contains(cellContent.toUpperCase()).should('exist').click();
        cy.get('#opfab-div-card-template-processed').contains(cardText).should('exist');

        if (entityRecipientsFooterText !== '')
            cy.get('#opfab-card-detail-footer').contains(entityRecipientsFooterText).should('exist');

        cy.get('#opfab-archives-card-detail-close').click({force: true});
    }

    function checkMultifiltersWhenAllProcessStatesAreDisplayed() {
        // We check we have 9 items in process multi-filter, even without choosing a process group
        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.checkNumberOfProcessEntriesIs(9);
        archivesAndLogging.checkProcessSelectContains('Conference and IT incident');
        archivesAndLogging.checkProcessSelectContains('External recipient');
        archivesAndLogging.checkProcessSelectContains('Message or question');
        archivesAndLogging.checkProcessSelectContains('Task');
        archivesAndLogging.checkProcessSelectContains('Task Advanced');
        archivesAndLogging.checkProcessSelectContains('IGCC');
        archivesAndLogging.checkProcessSelectContains('Process example');
        archivesAndLogging.checkProcessSelectContains('Test process for cypress');
        archivesAndLogging.checkProcessSelectContains('Supervisor');

        archivesAndLogging.clickOnProcessGroupSelect();
        archivesAndLogging.checkNumberOfProcessGroupEntriesIs(3);
        archivesAndLogging.checkProcessGroupSelectContains('--');
        archivesAndLogging.checkProcessGroupSelectContains('Base Examples');
        archivesAndLogging.checkProcessGroupSelectContains('User card examples');
        archivesAndLogging.selectAllProcessGroups();

        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.checkNumberOfProcessEntriesIs(9);
        archivesAndLogging.checkProcessSelectContains('Conference and IT incident');
        archivesAndLogging.checkProcessSelectContains('External recipient');
        archivesAndLogging.checkProcessSelectContains('Message or question');
        archivesAndLogging.checkProcessSelectContains('Task');
        archivesAndLogging.checkProcessSelectContains('Task Advanced');
        archivesAndLogging.checkProcessSelectContains('IGCC');
        archivesAndLogging.checkProcessSelectContains('Process example');
        archivesAndLogging.checkProcessSelectContains('Test process for cypress');
        archivesAndLogging.checkProcessSelectContains('Supervisor');

        archivesAndLogging.selectAllProcesses();
        archivesAndLogging.clickOnProcessSelect();

        archivesAndLogging.clickOnStateSelect();
        archivesAndLogging.selectAllStates();
        archivesAndLogging.checkNumberOfStateSelectedIs(36);

        archivesAndLogging.clickOnProcessGroupSelect();
        archivesAndLogging.selectAllProcessGroups();
        archivesAndLogging.selectProcess('Process example');
        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.clickOnStateSelect();
        archivesAndLogging.checkNumberOfStateEntriesIs(8);
        archivesAndLogging.checkStateSelectContains('Process example');
        archivesAndLogging.checkStateSelectContains('Message');
        archivesAndLogging.checkStateSelectContains('Data quality');
        archivesAndLogging.checkStateSelectContains('Electricity consumption forecast');
        archivesAndLogging.checkStateSelectContains('Action Required');
        archivesAndLogging.checkStateSelectContains('Additional information required');
        archivesAndLogging.checkStateSelectContains('Network Contingencies');
    }

    function checkMultifiltersForNotAdminModeForItsupervisor1() {
        // We check we have 7 items in process multi-filter, even without choosing a process group
        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.checkNumberOfProcessEntriesIs(7);
        archivesAndLogging.checkProcessSelectContains('Conference and IT incident');
        archivesAndLogging.checkProcessSelectContains('Message or question');
        archivesAndLogging.checkProcessSelectContains('Task');
        archivesAndLogging.checkProcessSelectContains('Task Advanced');
        archivesAndLogging.checkProcessSelectContains('IGCC');
        archivesAndLogging.checkProcessSelectContains('Process example');
        archivesAndLogging.checkProcessSelectContains('Test process for cypress');

        archivesAndLogging.clickOnProcessGroupSelect();
        archivesAndLogging.checkNumberOfProcessGroupEntriesIs(3);
        archivesAndLogging.checkProcessGroupSelectContains('--');
        archivesAndLogging.checkProcessGroupSelectContains('Base Examples');
        archivesAndLogging.checkProcessGroupSelectContains('User card examples');
        archivesAndLogging.selectAllProcessGroups();

        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.checkNumberOfProcessEntriesIs(7);
        archivesAndLogging.checkProcessSelectContains('Conference and IT incident');
        archivesAndLogging.checkProcessSelectContains('Message or question');
        archivesAndLogging.checkProcessSelectContains('Task');
        archivesAndLogging.checkProcessSelectContains('Task Advanced');
        archivesAndLogging.checkProcessSelectContains('IGCC');
        archivesAndLogging.checkProcessSelectContains('Process example');
        archivesAndLogging.checkProcessSelectContains('Test process for cypress');
        archivesAndLogging.selectAllProcesses();
        archivesAndLogging.clickOnProcessSelect();

        archivesAndLogging.clickOnStateSelect();
        archivesAndLogging.selectAllStates();
        archivesAndLogging.checkNumberOfStateSelectedIs(27);

        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.unselectAllProcesses();
        cy.selectProcess('Process example');
        archivesAndLogging.clickOnProcessSelect();
        archivesAndLogging.clickOnStateSelect();
        archivesAndLogging.checkNumberOfStateEntriesIs(2);
        archivesAndLogging.checkStateSelectContains('Action Required');
    }
});
