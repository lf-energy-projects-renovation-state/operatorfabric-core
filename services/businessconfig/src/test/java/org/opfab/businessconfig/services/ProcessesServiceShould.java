/* Copyright (c) 2018-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

package org.opfab.businessconfig.services;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.assertj.core.api.Condition;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.opfab.businessconfig.application.IntegrationTestApplication;
import org.opfab.businessconfig.model.Process;
import org.opfab.businessconfig.model.ProcessGroup;
import org.opfab.businessconfig.model.ProcessGroups;
import org.opfab.utilities.PathUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.opfab.businessconfig.model.ResourceTypeEnum.*;
import static org.opfab.utilities.PathUtils.copy;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = { IntegrationTestApplication.class })
@Slf4j
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ProcessesServiceShould {

    private static Path testDataDir = Paths.get("./build/test-data/businessconfig-storage");
    private static Path bundleDataDir = Paths.get("./build/test-data/businessconfig-storage/bundles");
    @Autowired
    private ProcessesService service;

    @BeforeEach
    void prepare() throws IOException {
        PathUtils.setApplicationBasePath("/");
        // Delete and recreate bundle directory to start with clean data
        restoreBundleDirectory();
        service.loadCache();
        service.loadProcessGroupsCache();
    }

    @AfterAll
    void restoreBundleDirectory() throws IOException {
        if (Files.exists(testDataDir))
            Files.walk(testDataDir, 1).forEach(PathUtils::silentDelete);
        copy(Paths.get("./src/test/docker/volume/businessconfig-storage"), testDataDir);

    }

    @Test
    void listProcesses() {
        assertThat(service.listProcesses(null)).hasSize(2);
    }

    @Test
    void listProcessHistory() {
        List<Process> processHistory = service.listProcessHistory("first");
        assertThat(processHistory).hasSize(3);
        assertThat(processHistory.get(0).id()).isEqualTo("first");
        assertThat(processHistory.get(0).version()).isEqualTo("0.1");
        assertThat(processHistory.get(1).id()).isEqualTo("first");
        assertThat(processHistory.get(1).version()).isEqualTo("0.5");
        assertThat(processHistory.get(2).id()).isEqualTo("first");
        assertThat(processHistory.get(2).version()).isEqualTo("v1");
    }

    @Test
    void fetch() {
        Process firstProcess = service.fetch("first");
        assertThat(firstProcess).hasFieldOrPropertyWithValue("version", "v1");
    }

    @Test
    void fetchWithVersion() {
        Process firstProcess = service.fetch("first", "0.1");
        assertThat(firstProcess).hasFieldOrPropertyWithValue("version", "0.1");
    }

    @Test
    void fetchCss() throws IOException {
        File styleFile = service.fetchResource("first", CSS, "style1").getFile();
        assertThat(styleFile.getParentFile())
                .isDirectory()
                .doesNotHave(
                        new Condition<>(f -> f.getName().equals("fr") || f.getName().equals("en"),
                                "parent directory should not be a locale directory"));
        assertThat(styleFile)
                .exists()
                .isFile()
                .hasName("style1.css")
                .hasContent("""
                        .bold {
                            font-weight: bold;
                        }""");
        styleFile = service.fetchResource("first", CSS, "0.1", "style1").getFile();
        assertThat(styleFile)
                .exists()
                .isFile()
                .hasName("style1.css")
                .hasContent("""
                        .bold {
                            font-weight: bolder;
                        }""");
        styleFile = service.fetchResource("first", CSS, "0.1", "style1").getFile();
        assertThat(styleFile)
                .exists()
                .isFile()
                .hasName("style1.css")
                .hasContent("""
                        .bold {
                            font-weight: bolder;
                        }""");
    }

    @Test
    void fetchTemplate() throws IOException {
        File templateFile = service.fetchResource("first", TEMPLATE, null, "template1").getFile();
        assertThat(templateFile.getParentFile()).isDirectory().hasName("template");
        assertThat(templateFile)
                .exists()
                .isFile()
                .hasName("template1.handlebars")
                .hasContent("{{service}}");
        templateFile = service.fetchResource("first", TEMPLATE, "0.1", "template").getFile();
        assertThat(templateFile)
                .exists()
                .isFile()
                .hasName("template.handlebars")
                .hasContent("{{service}} 0.1");
        templateFile = service.fetchResource("first", TEMPLATE, "0.1", "template").getFile();
        assertThat(templateFile)
                .exists()
                .isFile()
                .hasName("template.handlebars")
                .hasContent("{{service}} 0.1");
    }

    @Test
    void fetchTranslation() throws IOException {
        File i18nFile = service.fetchResource("first", I18N, null, "i18n").getFile();
        assertThat(i18nFile)
                .exists()
                .isFile()
                .hasName("i18n.json")
                .hasContent("card.title=\"Title $1\"");
        i18nFile = service.fetchResource("first", I18N, "0.1", "i18n").getFile();
        assertThat(i18nFile)
                .exists()
                .isFile()
                .hasName("i18n.json")
                .hasContent("card.title=\"Title $1 0.1\"");
    }

    @Test
    void fetchResourceError() {
        assertThatExceptionOfType(FileNotFoundException.class).isThrownBy(() -> service.fetchResource("what",
                TEMPLATE,
                "0.1",
                "template"));
        assertThatExceptionOfType(FileNotFoundException.class).isThrownBy(() -> service.fetchResource("first",
                TEMPLATE,
                "0.2",
                "template"));
        assertThatExceptionOfType(FileNotFoundException.class).isThrownBy(() -> service.fetchResource("first",
                CSS,
                "0.1",
                "styleWhat"));
        assertThatExceptionOfType(FileNotFoundException.class).isThrownBy(() -> service.fetchResource("first",
                TEMPLATE,
                "0.1",
                "template1")
                .getInputStream());
    }

    @Test
    void testCheckNoDuplicateProcessInUploadedFile() {

        ProcessGroup gp1 = new ProcessGroup("gp1","gp1",Arrays.asList("process1", "process2"));
        ProcessGroup gp2 = new ProcessGroup("gp2","gp2",Arrays.asList("process3", "process4"));
        ProcessGroup gp3 = new ProcessGroup("gp3","gp3",Arrays.asList("process5", "process4"));
        ProcessGroup gp4 = new ProcessGroup("gp4","gp4",Arrays.asList("process7", "process8", "process7"));

        ProcessGroups groupsWithoutDuplicate = new ProcessGroups(Arrays.asList(gp1, gp2));
        ProcessGroups groupsWithDuplicate = new ProcessGroups(Arrays.asList(gp2, gp3));
        ProcessGroups groupsWithDuplicateInTheSameGroup = new ProcessGroups(Arrays.asList(gp1, gp4));

        assertThat(service.checkNoDuplicateProcessInUploadedFile(groupsWithoutDuplicate)).isTrue();
        assertThat(service.checkNoDuplicateProcessInUploadedFile(groupsWithDuplicate)).isFalse();
        assertThat(service.checkNoDuplicateProcessInUploadedFile(groupsWithDuplicateInTheSameGroup)).isFalse();
    }

    @Nested
    class CreateContent {
        @RepeatedTest(2)
        void updateProcess() throws IOException {
            Path pathToBundle = Paths.get("./build/test-data/bundles/second-2.0.tar.gz");
            try (InputStream is = Files.newInputStream(pathToBundle)) {
                Process process = service.updateProcess(is);
                assertThat(process).hasFieldOrPropertyWithValue("id", "second");
                assertThat(process).hasFieldOrPropertyWithValue("version", "2.0");
                assertThat(process.states()).hasSize(1);
                assertThat(process.states().get("firstState").templateName()).isEqualTo("template");
                assertThat(process.states().get("firstState").response().externalRecipients()).hasSize(2);
                assertThat(service.listProcesses(null)).hasSize(3);
            } catch (IOException e) {
                log.trace("rethrowing exception");
                throw e;
            }
        }

        @Nested
        class DeleteOnlyOneBusinessconfig {

            static final String BUNDLE_NAME = "first";

            static final String CONFIG_FILE_NAME = "config.json";

            @BeforeEach
            void prepare() throws IOException {
                // This will also delete the businessconfig-storage root folder, but in this
                // case it's needed as
                // the following copy would fail if the folder already existed.
                if (Files.exists(testDataDir))
                    Files.walk(testDataDir, 1).forEach(PathUtils::silentDelete);
                copy(Paths.get("./src/test/docker/volume/businessconfig-storage"), testDataDir);
                service.loadCache();
            }

            @Test
            void deleteBundleByNameAndVersionWhichNotBeingDefault() throws Exception {
                Path bundleDir = bundleDataDir.resolve(BUNDLE_NAME);
                Path bundleVersionDir = bundleDir.resolve("0.1");
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                Assertions.assertTrue(Files.isDirectory(bundleVersionDir));
                service.deleteVersion(BUNDLE_NAME, "0.1");
                Assertions.assertNull(service.fetch(BUNDLE_NAME, "0.1"));
                Process process = service.fetch(BUNDLE_NAME);
                Assertions.assertNotNull(process);
                assertThat(process.version()).isNotEqualTo("0.1");
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                Assertions.assertFalse(Files.isDirectory(bundleVersionDir));
            }

            @Test
            void deleteBundleByNameAndVersionWhichBeingDeafult1() throws Exception {
                Path bundleDir = bundleDataDir.resolve(BUNDLE_NAME);
                Process process = service.fetch(BUNDLE_NAME);
                assertThat(process.version()).isEqualTo("v1");
                Path bundleVersionDir = bundleDir.resolve("v1");
                Path bundleNewDefaultVersionDir = bundleDir.resolve("0.1");
                FileUtils.touch(bundleNewDefaultVersionDir.toFile());// this is to be sure this version is the last
                                                                     // modified
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                Assertions.assertTrue(Files.isDirectory(bundleVersionDir));
                service.deleteVersion(BUNDLE_NAME, "v1");
                Assertions.assertNull(service.fetch(BUNDLE_NAME, "v1"));
                process = service.fetch(BUNDLE_NAME);
                Assertions.assertNotNull(process);
                assertThat(process.version()).isEqualTo("0.1");
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                Assertions.assertFalse(Files.isDirectory(bundleVersionDir));
                Assertions.assertTrue(Files.isDirectory(bundleNewDefaultVersionDir));
                Assertions.assertTrue(FileUtils.contentEquals(bundleDir.resolve(CONFIG_FILE_NAME).toFile(),
                        bundleNewDefaultVersionDir.resolve(CONFIG_FILE_NAME).toFile()));
            }

            @Test
            void deleteBundleByNameAndVersionWhichBeingDefault2() throws Exception {
                Path bundleDir = bundleDataDir.resolve(BUNDLE_NAME);
                final Process process = service.fetch(BUNDLE_NAME);
                assertThat(process.version()).isEqualTo("v1");
                Path bundleVersionDir = bundleDir.resolve("v1");
                Path bundleNewDefaultVersionDir = bundleDir.resolve("0.5");
                FileUtils.touch(bundleNewDefaultVersionDir.toFile());// this is to be sure this version is the last
                                                                     // modified
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                Assertions.assertTrue(Files.isDirectory(bundleVersionDir));
                service.deleteVersion(BUNDLE_NAME, "v1");
                Assertions.assertNull(service.fetch(BUNDLE_NAME, "v1"));
                Process process05 = service.fetch(BUNDLE_NAME);
                Assertions.assertNotNull(process05);
                assertThat(process05.version()).isEqualTo("0.5");
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                Assertions.assertFalse(Files.isDirectory(bundleVersionDir));
                Assertions.assertTrue(Files.isDirectory(bundleNewDefaultVersionDir));
                Assertions.assertTrue(FileUtils.contentEquals(bundleDir.resolve(CONFIG_FILE_NAME).toFile(),
                        bundleNewDefaultVersionDir.resolve(CONFIG_FILE_NAME).toFile()));
            }

            @Test
            void deleteBundleByNameAndVersionWhichNotExisting() {
                Assertions.assertThrows(FileNotFoundException.class, () -> {
                    service.deleteVersion(BUNDLE_NAME,
                            "impossible_someone_really_so_crazy_to_give_this_name_to_a_version");
                });
            }

            @Test
            void deleteBundleByNameWhichNotExistingAndVersion() {
                Assertions.assertThrows(FileNotFoundException.class, () -> {
                    service.deleteVersion("impossible_someone_really_so_crazy_to_give_this_name_to_a_bundle", "1.0");
                });
            }

            @Test
            void deleteBundleByNameAndVersionHavingOnlyOneVersion() throws Exception {
                Path bundleDir = bundleDataDir.resolve("deletetest");
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                service.deleteVersion("deletetest", "2.1");
                Assertions.assertNull(service.fetch("deletetest", "2.1"));
                Assertions.assertNull(service.fetch("deletetest"));
                Assertions.assertFalse(Files.isDirectory(bundleDir));
            }

            @Test
            void deleteGivenBundle() throws Exception {
                Path bundleDir = bundleDataDir.resolve(BUNDLE_NAME);
                Assertions.assertTrue(Files.isDirectory(bundleDir));
                service.delete(BUNDLE_NAME);
                Assertions.assertFalse(Files.isDirectory(bundleDir));
            }

            @Nested
            class DeleteContent {
                @Test
                void clean() throws IOException {
                    service.clear();
                    assertThat(service.listProcesses(null)).isEmpty();
                }
            }
        }
    }
}
