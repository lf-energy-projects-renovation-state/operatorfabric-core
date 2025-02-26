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

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.opfab.utilities.PathUtils.copy;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;


@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = {IntegrationTestApplication.class})
@WebAppConfiguration
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@WithMockOpFabUser(login="nonAdminUser")
class GivenNonAdminUserBusinessconfigControllerShould {

    private static Path testDataDir = Paths.get("./build/test-data/businessconfig-storage");

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;
    @Autowired
    private ProcessesService service;

    @BeforeAll
    void setup() throws Exception {
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
        mockMvc.perform(get("/processes"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
        ;
    }

    @Test
    void listProcessGroups() throws Exception {
        mockMvc.perform(get("/processgroups"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.groups", hasSize(0)))
        ;
    }

    @Test
    void listRealTimeScreens() throws Exception {
        mockMvc.perform(get("/realtimescreens"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.realTimeScreens", hasSize(0)))
        ;
    }

    @Test
    void fetch() throws Exception {
        ResultActions result = mockMvc.perform(get("/processes/first"));
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.version", is("v1")))
        ;
    }

    @Test
    void fetchWithVersion() throws Exception {
        ResultActions result = mockMvc.perform(get("/processes/first?version=0.1"));
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.version", is("0.1")));
    }

    @Test
    void fetchNonExistingProcesses() throws Exception {
        mockMvc.perform(get("/processes/DOES_NOT_EXIST"))
                .andExpect(status().isNotFound());
    }

    @Test
    void fetchCssResource() throws Exception {
        ResultActions result = mockMvc.perform(
                get("/processes/first/css/style1")
                        .accept("text/css"));
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/css"))
                .andExpect(content().string(is("""
                        .bold {
                            font-weight: bold;
                        }""")))
        ;
        result = mockMvc.perform(
                get("/processes/first/css/style1?version=0.1")
                        .accept("text/css"));
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/css"))
                .andExpect(content().string(is("""
                        .bold {
                            font-weight: bolder;
                        }""")))
        ;
    }

    @Test
    void fetchTemplateResource() throws Exception {
        ResultActions result = mockMvc.perform(
                get("/processes/first/templates/template1")
                        .accept("application/handlebars")
        );
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/handlebars"))
                .andExpect(content().string(is("{{service}}")))
        ;
        result = mockMvc.perform(
                get("/processes/first/templates/template?version=0.1")
                        .accept("application/handlebars"));
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/handlebars"))
                .andExpect(content().string(is("{{service}} 0.1")))
        ;
        result = mockMvc.perform(
                get("/processes/first/templates/templateIO?version=0.1")
                        .accept("application/json", "application/handlebars"));
        result
                .andExpect(status().is4xxClientError())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        ;
    }

    @Test
    void fetchTranslationResource() throws Exception {
        ResultActions result = mockMvc.perform(
                get("/processes/first/i18n")
                        .accept("text/plain")
        );
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/plain"))
                .andExpect(content().string(is("card.title=\"Title $1\"")))
        ;
        result = mockMvc.perform(
                get("/processes/first/i18n?version=0.1")
                        .accept("text/plain")
        );
        result
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/plain"))
                .andExpect(content().string(is("card.title=\"Title $1 0.1\"")))
        ;

        assertThatExceptionOfType(FileNotFoundException.class).isThrownBy(() ->
                mockMvc.perform(
                        get("/processes/first/i18n?version=2.1")
                                .accept("text/plain")
                ));
    }

    @Nested
    @WithMockOpFabUser(login="nonAdminUser")
    class CreateContent {
        @Test
        void notAllowBundleToBePost() throws Exception {
            Path pathToBundle = Paths.get("./build/test-data/bundles/second-2.1.tar.gz");
            MockMultipartFile bundle = new MockMultipartFile("file", "second-2.1.tar.gz", "application/gzip", Files
                    .readAllBytes(pathToBundle));
            mockMvc.perform(multipart("/processes/second").file(bundle))
                    .andExpect(status().isForbidden())
            ;

            mockMvc.perform(get("/processes"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$", hasSize(2)));
        }

        @Test
        void notAllowProcessGroupsToBePost() throws Exception {
            Path pathToProcessGroupsFile = Paths.get("./build/test-data/processgroups.json");

            MockMultipartFile processGroupsFile = new MockMultipartFile("file", "processgroups.json", MediaType.TEXT_PLAIN_VALUE, Files
                    .readAllBytes(pathToProcessGroupsFile));

            mockMvc.perform(multipart("/processgroups").file(processGroupsFile))
                    .andExpect(status().isForbidden())
            ;

            mockMvc.perform(get("/processgroups"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.groups", hasSize(0)));
        }

        @Test
        void notAllowRealTimeScreensToBePost() throws Exception {
            Path pathToRealTimeScreensFile = Paths.get("./build/test-data/realtimescreens.json");

            MockMultipartFile realTimeScreensFile = new MockMultipartFile("file", "realtimescreens.json", MediaType.TEXT_PLAIN_VALUE, Files
                    .readAllBytes(pathToRealTimeScreensFile));

            mockMvc.perform(multipart("/realtimescreens").file(realTimeScreensFile))
                    .andExpect(status().isForbidden())
            ;

            mockMvc.perform(get("/realtimescreens"))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.realTimeScreens", hasSize(0)));
        }

        @Test
        void notAllowMonitoringToBePosted() throws Exception {

                mockMvc.perform(post("/monitoring").contentType(MediaType.APPLICATION_JSON)
                                .content("{}")).andExpect(status().isForbidden());

                mockMvc.perform(get("/monitoring")).andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.export.fields[0].columnName", is(notNullValue())));
        }

        @Nested
        @WithMockOpFabUser(login="nonAdminUser")
        class DeleteOnlyOneProcess {
        	
        	static final String BUNDLE_NAME = "first";
        	
        	@BeforeEach
            void setup() throws Exception {
                // This will also delete the businessconfig-storage root folder, but in this case it's needed as
                // the following copy would fail if the folder already existed.
        		if (Files.exists(testDataDir)) Files.walk(testDataDir, 1).forEach(PathUtils::silentDelete);
  			    copy(Paths.get("./src/test/docker/volume/businessconfig-storage"), testDataDir);
  			    service.loadCache();
            }
        	
        	@Test
            void deleteBundleByNameAndVersionWhichNotBeingDeafult() throws Exception {
        		ResultActions result = mockMvc.perform(delete("/processes/"+ BUNDLE_NAME +"/versions/0.1"));
                result
                        .andExpect(status().isForbidden());
            }
        	
        	@Test
            void deleteGivenBundle() throws Exception {
        		ResultActions result = mockMvc.perform(delete("/processes/"+ BUNDLE_NAME));
                result
                        .andExpect(status().isForbidden());
            }
        	
        	@Test
            void deleteGivenBundleNotFoundError() throws Exception {
        		ResultActions result = mockMvc.perform(delete("/processes/impossible_a_businessconfig_with_this_exact_name_exists"));
                result
                        .andExpect(status().isForbidden());
            }
        	
        	@Nested
            @WithMockOpFabUser(login="nonAdminUser")
            class DeleteContent {
                @Test
                void clean() throws Exception {
                    mockMvc.perform(delete("/processes"))
                            .andExpect(status().isForbidden());
                    mockMvc.perform(get("/processes"))
                            .andExpect(status().isOk())
                            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                            .andExpect(jsonPath("$", hasSize(2)));
                }
            }
        	
        }
        
    }

}
