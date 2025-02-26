/* Copyright (c) 2022-2025, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {
    AfterViewChecked,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewEncapsulation
} from '@angular/core';
import {Card} from 'app/model/Card';
import {HandlebarsService} from '../../../services/handlebars/HandlebarsService';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {State} from '@ofServices/processes/model/Processes';
import {DetailContext} from '@ofServices/handlebars/model/DetailContext.model';
import {UserContext} from '@ofServices/handlebars/model/UserContext.model';
import {map, skip, takeUntil} from 'rxjs/operators';
import {Observable, Subject, zip} from 'rxjs';
import {User} from '@ofServices/users/model/User';
import {LoggerService as logger} from 'app/services/logs/LoggerService';
import {DisplayContext} from 'app/model/DisplayContext';
import {TemplateCssService} from '@ofServices/templateCss/TemplateCssService';
import {GlobalStyleService} from '@ofServices/style/global-style.service';
import {CurrentUserStore} from '../../../store/CurrentUserStore';
import {UsersService} from '@ofServices/users/UsersService';
import {NgIf} from '@angular/common';
import {SpinnerComponent} from '../spinner/spinner.component';
import {CardTemplateGateway} from '@ofServices/templateGateway/CardTemplateGateway';

@Component({
    selector: 'of-template-rendering',
    templateUrl: './template-rendering.component.html',
    styleUrls: ['./template-rendering.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgIf, SpinnerComponent]
})
export class TemplateRenderingComponent implements OnChanges, OnInit, OnDestroy, AfterViewChecked {
    @Input() cardState: State;
    @Input() card: Card;
    @Input() user: User;
    @Input() fixedBottomOffset = 0;
    @Input() cardFooterHtmlElementId: string;
    @Input() screenSize = 'md';
    @Input() functionToCallBeforeRendering: Function;
    @Input() functionToCallAfterRendering: Function;
    @Input() parentComponent: Component;
    @Input() displayContext: DisplayContext;

    @Output() renderingDone = new EventEmitter();

    public htmlTemplateContent: SafeHtml;
    public isLoadingSpinnerToDisplay = false;

    private userContext: UserContext;
    private readonly unsubscribeToGlobalStyle$: Subject<void> = new Subject<void>();
    private templateLoaded: boolean;

    constructor(
        private readonly element: ElementRef,
        private readonly sanitizer: DomSanitizer,
        private readonly changeDetector: ChangeDetectorRef
    ) {}

    public ngOnInit() {
        this.informTemplateWhenGlobalStyleChange();
        addEventListener('resize', this.computeRenderingHeight);
    }

    // For certain types of template , we need to inform it to take into account
    // the new css style (for example with chart done with chart.js)
    private informTemplateWhenGlobalStyleChange() {
        GlobalStyleService.getStyleChange()
            .pipe(takeUntil(this.unsubscribeToGlobalStyle$), skip(1))
            .subscribe(() => CardTemplateGateway.sendStyleChangeToTemplate());
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.screenSize && this.templateLoaded) CardTemplateGateway.sendScreenSizeToTemplate(this.screenSize);
        else this.render();
    }

    private render() {
        this.isLoadingSpinnerToDisplay = false;
        CardTemplateGateway.initTemplateFunctions();
        this.enableSpinnerForTemplate();
        this.getUserContextAndRenderTemplate();
    }

    private enableSpinnerForTemplate() {
        CardTemplateGateway.setFunctionToDisplayLoadingSpinner(() => {
            this.isLoadingSpinnerToDisplay = true;
            this.changeDetector.markForCheck();
        });
        CardTemplateGateway.setFunctionToHideLoadingSpinner(() => {
            this.isLoadingSpinnerToDisplay = false;
            this.changeDetector.markForCheck();
        });
    }

    private getUserContextAndRenderTemplate() {
        if (!this.userContext) {
            const user = UsersService.getCurrentUserWithPerimeters().userData;
            const token = CurrentUserStore.getToken();
            this.userContext = new UserContext(
                user.login,
                token,
                user.firstName,
                user.lastName,
                this.user.groups,
                this.user.entities
            );
        }
        this.computeAndRenderTemplate();
    }

    private computeAndRenderTemplate() {
        if (this.cardState.templateName) {
            this.isLoadingSpinnerToDisplay = true;
            if (this.functionToCallBeforeRendering) this.functionToCallBeforeRendering.call(this.parentComponent);
            CardTemplateGateway.setDisplayContext(this.displayContext);

            this.getHTMLFromTemplate().subscribe({
                next: (html) => {
                    this.htmlTemplateContent = html;
                    this.changeDetector.markForCheck();

                    setTimeout(() => {
                        // wait for DOM rendering
                        this.isLoadingSpinnerToDisplay = false;
                        this.loadTemplateJSScripts();
                        setTimeout(() => {
                            // Wait for template script execution
                            this.callTemplateJsPostRenderingFunctions();
                            this.templateLoaded = true;
                            this.changeDetector.markForCheck();
                        }, 10);
                    }, 10);
                },
                error: (error) => {
                    logger.error(`ERROR impossible to process template  ${this.cardState.templateName} : ${error} `);
                    this.htmlTemplateContent = this.sanitizer.bypassSecurityTrustHtml('');
                    this.isLoadingSpinnerToDisplay = false;
                }
            });
        } else {
            this.htmlTemplateContent = ' TECHNICAL ERROR - NO TEMPLATE AVAILABLE';
            logger.error(
                `ERROR No template for process ${this.card.process} version ${this.card.processVersion} with state ${this.card.state}`
            );
        }
    }

    private getHTMLFromTemplate(): Observable<SafeHtml> {
        const htmlContent$ = HandlebarsService.executeTemplate(
            this.cardState.templateName,
            new DetailContext(this.card, this.userContext)
        );
        const cssContent$ = this.getCssFilesContent();
        const html = zip(htmlContent$, cssContent$)
            .pipe(map(([html, css]) => `${html} <style> ${css} </style>`))
            .pipe(map((html) => this.sanitizer.bypassSecurityTrustHtml(html)));
        return html;
    }

    private getCssFilesContent(): Observable<string> {
        const styles = this.cardState.styles;
        return TemplateCssService.getCssFilesContent(this.card.process, this.card.processVersion, styles);
    }

    private loadTemplateJSScripts(): void {
        //bug eslint/prettier
        const scripts = <HTMLScriptElement[]>this.element.nativeElement.getElementsByTagName('script'); // eslint-disable-line
        const scriptsInitialLength = scripts.length;
        for (let i = 0; i < scriptsInitialLength; i++) {
            const script = scripts[i];
            const scriptCopy = document.createElement('script');
            scriptCopy.type = script.type ? script.type : 'text/javascript';
            if (script.innerHTML) {
                scriptCopy.innerHTML = script.innerHTML;
            }
            scriptCopy.async = false;
            script.parentNode.replaceChild(scriptCopy, script);
        }
    }

    private callTemplateJsPostRenderingFunctions() {
        if (this.functionToCallAfterRendering) this.functionToCallAfterRendering.call(this.parentComponent);
        CardTemplateGateway.sendScreenSizeToTemplate(this.screenSize);
        CardTemplateGateway.sendChildCardsToTemplate();
        setTimeout(() => CardTemplateGateway.sendTemplateRenderingCompleteToTemplate(), 10);
    }

    public ngAfterViewChecked() {
        this.computeRenderingHeight();
    }

    private readonly computeRenderingHeight = () => {
        const htmlElementForCardRendering = document.getElementById('opfab-div-card-template');
        if (htmlElementForCardRendering) {
            const renderingRect = htmlElementForCardRendering.getBoundingClientRect();
            let renderingHeight = window.innerHeight - renderingRect.top - this.fixedBottomOffset;

            if (this.cardFooterHtmlElementId) {
                const cardFooterElement = document.getElementById(this.cardFooterHtmlElementId);
                if (cardFooterElement) {
                    renderingHeight -= cardFooterElement.scrollHeight;
                }
            }
            htmlElementForCardRendering.style.height = `${renderingHeight}px`;
        }
    };

    ngOnDestroy() {
        removeEventListener('resize', this.computeRenderingHeight);
        CardTemplateGateway.initTemplateFunctions();
        this.unsubscribeToGlobalStyle$.next();
        this.unsubscribeToGlobalStyle$.complete();
    }
}
