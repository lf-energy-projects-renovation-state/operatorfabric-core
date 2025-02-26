/* Copyright (c) 2021-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import * as _ from 'lodash-es';

export class FieldDescription {
    public jsonField: string;
    public columnNumber: number;
    public type: string;
    public isNested: boolean;

    constructor(jsonField: string, type: string, columnNumber: number, isNested: boolean) {
        this.jsonField = jsonField;
        this.type = type;
        this.columnNumber = columnNumber;
        this.isNested = isNested;
    }
}

export class JsonToArray {
    private jsonAsArray: string[][] = [[]];
    private readonly fieldDescriptions: FieldDescription[] = [];
    private readonly columnIndexes = new Map();
    private readonly nestedJsonToArrays = new Map();
    private readonly fieldsProcessOnlyIfPreviousArraysAreEmpty = new Set();

    constructor(rules: any) {
        rules.forEach((rule) => this.processRule(rule, false));
    }

    private processRule(rule, innerRule: boolean) {
        if (!rule.jsonField) return;
        if (rule.fields) {
            this.fieldDescriptions.push(new FieldDescription(rule.jsonField, rule.type, -1, true));
            if (rule.processOnlyIfPreviousArraysAreEmpty)
                this.fieldsProcessOnlyIfPreviousArraysAreEmpty.add(rule.jsonField);
            rule.fields.forEach((field) => this.processRule(field, true));
            this.nestedJsonToArrays.set(rule.jsonField, new JsonToArray(rule.fields));
        } else if (rule.columnName) {
            this.addColumn(rule.columnName);
            if (!innerRule)
                this.fieldDescriptions.push(
                    new FieldDescription(rule.jsonField, rule.type, this.columnIndexes.get(rule.columnName), false)
                );
        }
    }

    private addColumn(columnName) {
        if (this.columnIndexes.get(columnName) === undefined) {
            this.jsonAsArray[0].push(columnName);
            this.columnIndexes.set(columnName, this.jsonAsArray[0].length - 1);
        }
    }

    public add(jsonObject: any) {
        const linesToAppend: string[][] = new Array();
        linesToAppend.push(new Array(this.jsonAsArray[0].length));
        this.fillArrayWithEmptyStrings(linesToAppend[0]);
        this.addFieldsToAppend(jsonObject, linesToAppend);
        this.addNestedArrayToAppend(jsonObject, linesToAppend);
        linesToAppend.forEach((line) => this.jsonAsArray.push(line));
    }

    private fillArrayWithEmptyStrings(array: string[]): void {
        for (let index = 0; index < array.length; index++) array[index] = '';
    }

    private addFieldsToAppend(jsonObject, linesToAppend) {
        this.fieldDescriptions.forEach((fieldDescription) => {
            let fieldValue = _.get(jsonObject, fieldDescription.jsonField);
            if (fieldValue) {
                if (fieldDescription.type && fieldDescription.type === 'EPOCHDATE' && !isNaN(fieldValue))
                    fieldValue = new Date(fieldValue);
                linesToAppend[0][fieldDescription.columnNumber] = fieldValue;
            }
        });
    }

    private addNestedArrayToAppend(jsonObject, linesToAppend) {
        let noArrayProcessedYet = true;
        const lineToDuplicate: string[] = Array.from(linesToAppend[0]);
        let startIndexForAppending = 0;
        for (const [jsonField, nestedJsonToArray] of this.nestedJsonToArrays) {
            const nestedJsonObjects = _.get(jsonObject, jsonField);
            if (
                nestedJsonObjects &&
                (noArrayProcessedYet || !this.fieldsProcessOnlyIfPreviousArraysAreEmpty.has(jsonField))
            ) {
                nestedJsonObjects.forEach((nestedObject) => {
                    nestedJsonToArray.add(nestedObject);
                });
                const nestedArray = nestedJsonToArray.getJsonAsArray();
                if (nestedArray.length > 1) {
                    this.addLinesFromNestedArray(nestedArray, linesToAppend, lineToDuplicate, startIndexForAppending);
                    startIndexForAppending += nestedArray.length - 1;
                    nestedJsonToArray.cleanJsonAsArray();
                    noArrayProcessedYet = false;
                }
            }
        }
    }

    private addLinesFromNestedArray(nestedArray, linesToAppend, lineToDuplicate, startIndexForAppending) {
        for (let nestedArrayRowIndex = 0; nestedArrayRowIndex < nestedArray.length - 1; nestedArrayRowIndex++) {
            // If not the first line in the table prepare new line
            if (nestedArrayRowIndex + startIndexForAppending > 0) linesToAppend.push(Array.from(lineToDuplicate));
            for (
                let nestedArrayColumnIndex = 0;
                nestedArrayColumnIndex < nestedArray[0].length;
                nestedArrayColumnIndex++
            ) {
                const col = nestedArray[0][nestedArrayColumnIndex];
                const value = nestedArray[nestedArrayRowIndex + 1][nestedArrayColumnIndex];
                const columnIndex = this.columnIndexes.get(col);
                linesToAppend[nestedArrayRowIndex + startIndexForAppending][columnIndex] = value;
            }
        }
    }

    public getJsonAsArray(): string[][] {
        return this.jsonAsArray;
    }

    public cleanJsonAsArray() {
        const firstLine = this.jsonAsArray[0];
        this.jsonAsArray = [[]];
        this.jsonAsArray[0] = Array.from(firstLine);
    }
}
