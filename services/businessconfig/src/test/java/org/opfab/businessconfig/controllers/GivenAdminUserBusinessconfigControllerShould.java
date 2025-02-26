/* Copyright (c) 2018-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

package org.opfab.businessconfig.controllers;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.opfab.users.model.PermissionEnum;
import org.opfab.businessconfig.application.IntegrationTestApplication;
import org.opfab.businessconfig.services.ProcessesService;
import org.opfab.springtools.configuration.test.WithMockOpFabUser;
import org.opfab.utilities.PathUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.context.WebApplicationContext;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.hamcrest.CoreMatchers.not;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

import static org.opfab.utilities.PathUtils.copy;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = { IntegrationTestApplication.class })
@WebAppConfiguration
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@WithMockOpFabUser(login = "adminUser", permissions = { PermissionEnum.ADMIN })
class GivenAdminUserBusinessconfigControllerShould {

        private static Path testDataDir = Paths.get("./build/test-data/businessconfig-storage");

        private MockMvc mockMvc;

        @Autowired
        private WebApplicationContext webApplicationContext;

        @Autowired
        private ProcessesService service;

        @BeforeAll
        void setup() throws Exception {
                PathUtils.setApplicationBasePath("/");
                copy(Paths.get("./src/test/docker/volume/businessconfig-storage"), testDataDir);
                this.mockMvc = webAppContextSetup(webApplicationContext)
                                .apply(springSecurity())
                                .build();
                service.loadCache();
                service.loadProcessGroupsCache();
                service.loadRealTimeScreensCache();
        }


        @AfterAll
        void dispose() throws IOException {
                service.clear();
        }

        @Test
        void listProcesses() throws Exception {
                mockMvc.perform(get("/businessconfig/processes"))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$", hasSize(2)));
        }

        @Test
        void listProcessGroups() throws Exception {
                mockMvc.perform(get("/businessconfig/processgroups"))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.groups", hasSize(0)));
        }

        @Test
        void fetch() throws Exception {
                ResultActions result = mockMvc.perform(get("/businessconfig/processes/first"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.version", is("v1")));
        }

        @Test
        void fetchWithVersion() throws Exception {
                ResultActions result = mockMvc.perform(get("/businessconfig/processes/first?version=0.1"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.version", is("0.1")));
        }

        @Test
        void fetchCssResource() throws Exception {
                ResultActions result = mockMvc.perform(
                                get("/businessconfig/processes/first/css/style1")
                                                .accept("text/css"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType("text/css"))
                                .andExpect(content().string(is("""
                                                            .bold {
                                                                font-weight: bold;
                                                            }""")));
                result = mockMvc.perform(
                                get("/processes/first/css/style1?version=0.1")
                                                .accept("text/css"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType("text/css"))
                                .andExpect(content().string(is("""
                                                            .bold {
                                                                font-weight: bolder;
                                                            }""")));
        }

        @Test
        void fetchTemplateResource() throws Exception {
                ResultActions result = mockMvc.perform(
                                get("/processes/first/templates/template1")
                                                .accept("application/handlebars"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType("application/handlebars"))
                                .andExpect(content().string(is("{{service}}")));
                result = mockMvc.perform(
                                get("/processes/first/templates/template?version=0.1")
                                                .accept("application/handlebars"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType("application/handlebars"))
                                .andExpect(content().string(is("{{service}} 0.1")));
                result = mockMvc.perform(
                                get("/processes/first/templates/templateIO?version=0.1")
                                                .accept("application/json", "application/handlebars"));
                result
                                .andExpect(status().is4xxClientError())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
        }

        @Test
        void fetchI18n() throws Exception {
                ResultActions result = mockMvc.perform(
                                get("/processes/first/i18n")
                                                .accept("text/plain"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType("text/plain"))
                                .andExpect(content().string(is("card.title=\"Title $1\"")));
                result = mockMvc.perform(
                                get("/processes/first/i18n?version=0.1")
                                                .accept("text/plain"));
                result
                                .andExpect(status().isOk())
                                .andExpect(content().contentType("text/plain"))
                                .andExpect(content().string(is("card.title=\"Title $1 0.1\"")));

                assertThatExceptionOfType(FileNotFoundException.class).isThrownBy(() -> mockMvc.perform(
                                get("/processes/first/i18n?version=2.1")
                                                .accept("text/plain")));
        }

        @Test
        void listRealTimeScreens() throws Exception {
                mockMvc.perform(get("/realtimescreens"))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.realTimeScreens", hasSize(0)));
        }

        @Nested
        @WithMockOpFabUser(login = "adminUser", permissions = { PermissionEnum.ADMIN })
        class CreateContent {
                @Test
                void create() throws Exception {
                        Path pathToBundle = Paths.get("./build/test-data/bundles/second-2.1.tar.gz");
                        MockMultipartFile bundle = new MockMultipartFile("file", "second-2.1.tar.gz",
                                        "application/gzip", Files
                                                        .readAllBytes(pathToBundle));
                        mockMvc.perform(multipart("/processes").file(bundle))
                                        .andExpect(status().isCreated())
                                        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                        .andExpect(jsonPath("$.id", is("second")))
                                        .andExpect(jsonPath("$.name", is("process.title")))
                                        .andExpect(jsonPath("$.version", is("2.1")));

                        mockMvc.perform(get("/processes"))
                                        .andExpect(status().isOk())
                                        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                        .andExpect(jsonPath("$", hasSize(3)));

                        mockMvc.perform(get("/processes/second/css/nostyle"))
                                        .andExpect(status().isNotFound());
                }

                @Test
                void createProcessGroups() throws Exception {
                        Path pathToProcessGroupsFile = Paths.get("./build/test-data/processgroups.json");

                        MockMultipartFile processGroupsFile = new MockMultipartFile("file", "processgroups.json",
                                        MediaType.TEXT_PLAIN_VALUE, Files
                                                        .readAllBytes(pathToProcessGroupsFile));

                        mockMvc.perform(multipart("/processgroups").file(processGroupsFile))
                                        .andExpect(status().isCreated());

                        mockMvc.perform(get("/processgroups"))
                                        .andExpect(status().isOk())
                                        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                        .andExpect(jsonPath("$.groups", hasSize(2)))
                                        .andExpect(jsonPath("$.groups[0].id", is("processgroup1")))
                                        .andExpect(jsonPath("$.groups[0].name", is("Process Group 1")))
                                        .andExpect(jsonPath("$.groups[1].id", is("processgroup2")))
                                        .andExpect(jsonPath("$.groups[1].name", is("Process Group 2")));
                }

                @Test
                void createProcessGroupsWithDuplicateProcessInSameGroup() throws Exception {
                        Path pathToProcessGroupsFile = Paths
                                        .get("./build/test-data/processgroups_with_duplicate_in_same_group.json");

                        MockMultipartFile processGroupsFile = new MockMultipartFile("file",
                                        "processgroups_with_duplicate_in_same_group.json", MediaType.TEXT_PLAIN_VALUE,
                                        Files
                                                        .readAllBytes(pathToProcessGroupsFile));

                        mockMvc.perform(multipart("/processgroups").file(processGroupsFile))
                                        .andExpect(status().isBadRequest())
                                        .andExpect(jsonPath("$.message",
                                                        is("There is a duplicate process in the file you have sent")));
                }

                @Test
                void createProcessGroupsWithDuplicateProcessInDifferentGroups() throws Exception {
                        Path pathToProcessGroupsFile = Paths
                                        .get("./build/test-data/processgroups_with_duplicate_in_different_groups.json");

                        MockMultipartFile processGroupsFile = new MockMultipartFile("file",
                                        "processgroups_with_duplicate_in_different_groups.json",
                                        MediaType.TEXT_PLAIN_VALUE, Files
                                                        .readAllBytes(pathToProcessGroupsFile));

                        mockMvc.perform(multipart("/processgroups").file(processGroupsFile))
                                        .andExpect(status().isBadRequest())
                                        .andExpect(jsonPath("$.message",
                                                        is("There is a duplicate process in the file you have sent")));
                }

                @Test
                void createRealTimeScreens() throws Exception {
                        Path pathToRealTimeScreensFile = Paths.get("./build/test-data/realtimescreens.json");

                        MockMultipartFile realTimeScreensFile = new MockMultipartFile("file", "realtimescreens.json",
                                        MediaType.TEXT_PLAIN_VALUE, Files
                                                        .readAllBytes(pathToRealTimeScreensFile));

                        mockMvc.perform(multipart("/realtimescreens").file(realTimeScreensFile))
                                        .andExpect(status().isCreated());

                        mockMvc.perform(get("/realtimescreens"))
                                        .andExpect(status().isOk())
                                        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                        .andExpect(jsonPath("$.realTimeScreens", hasSize(1)))
                                        .andExpect(jsonPath("$.realTimeScreens[0].screenName",
                                                        is("All Control Centers")))
                                        .andExpect(jsonPath("$.realTimeScreens[0].screenColumns", hasSize(2)))
                                        .andExpect(jsonPath("$.realTimeScreens[0].screenColumns[0].entitiesGroups",
                                                        hasSize(3)))
                                        .andExpect(jsonPath(
                                                        "$.realTimeScreens[0].screenColumns[0].entitiesGroups[0]",
                                                        is("ENTITY_FR")));
                }

                @Nested
                @WithMockOpFabUser(login = "adminUser", permissions = { PermissionEnum.ADMIN })
                class DeleteOnlyOneProcess {

                        static final String BUNDLE_NAME = "first";

                        @BeforeEach
                        void setupEach() throws Exception {
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
                                ResultActions result = mockMvc.perform(
                                                delete("/processes/" + BUNDLE_NAME + "/versions/0.1"));
                                result
                                                .andExpect(status().isNoContent());
                                result = mockMvc.perform(
                                                get("/processes/" + BUNDLE_NAME + "?version=0.1"));
                                result
                                                .andExpect(status().isNotFound());
                        }

                        @Test
                        void deleteBundleByNameAndVersionWhichBeingDefault() throws Exception {
                                mockMvc.perform(delete("/processes/" + BUNDLE_NAME + "/versions/v1"))
                                                .andExpect(status().isNoContent());
                                ResultActions result = mockMvc.perform(
                                                delete("/processes/" + BUNDLE_NAME + "/versions/0.1"));
                                result
                                                .andExpect(status().isNoContent());
                                result = mockMvc.perform(get("/processes/" + BUNDLE_NAME));
                                result
                                                .andExpect(status().isOk())
                                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                                .andExpect(jsonPath("$.version", is(not("v1"))));
                        }

                        @Test
                        void deleteBundleByNameAndVersionHavingOnlyOneVersion() throws Exception {
                                ResultActions result = mockMvc
                                                .perform(delete("/processes/deletetest/versions/2.1"));
                                result
                                                .andExpect(status().isNoContent());
                                result = mockMvc.perform(get("/processes/deletetest"));
                                result
                                                .andExpect(status().isNotFound());
                        }

                        @Test
                        void deleteBundleByNameAndVersion() throws Exception {
                                String[][] testData = {
                                                { "second", "impossible_someone_really_so_crazy_to_give_this_name_to_a_version" },
                                                { "impossible_someone_really_so_crazy_to_give_this_name_to_a_bundle",
                                                                "2.1" }
                                };

                                for (String[] data : testData) {
                                        String bundleName = data[0];
                                        String version = data[1];

                                        ResultActions result = mockMvc.perform(delete("/processes/"
                                                        + bundleName + "/versions/" + version));
                                        result.andExpect(status().isNotFound());
                                }
                        }

                        @Test
                        void deleteGivenBundle() throws Exception {
                                ResultActions result = mockMvc
                                                .perform(delete("/processes/" + BUNDLE_NAME));
                                result
                                                .andExpect(status().isNoContent());
                                result = mockMvc.perform(get("/processes/" + BUNDLE_NAME));
                                result
                                                .andExpect(status().isNotFound());
                        }

                        @Test
                        void deleteGivenBundleNotFoundError() throws Exception {
                                ResultActions result = mockMvc.perform(delete(
                                                "/processes/impossible_a_businessconfig_with_this_exact_name_exists"));
                                result
                                                .andExpect(status().isNotFound());
                        }

                        @Nested
                        @WithMockOpFabUser(login = "adminUser", permissions = { PermissionEnum.ADMIN })
                        class DeleteContent {
                                @Test
                                void clean() throws Exception {
                                        mockMvc.perform(delete("/processes"))
                                                        .andExpect(status().isNoContent());
                                        mockMvc.perform(get("/processes"))
                                                        .andExpect(status().isOk())
                                                        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                                        .andExpect(jsonPath("$", hasSize(0)));
                                }
                        }

                }

        }

}
