import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AccountService } from '@app/core/http/services/account-service/account.service';
import { AppMaterialModule } from '@app/modules/material.module';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    standalone: true,
    imports: [AppMaterialModule, RouterModule, CommonModule, TranslateModule],
})
export class MainPageComponent implements OnInit, OnDestroy {
    readonly title: string = 'PolyQuiz';
    constructor(public accountService: AccountService, private readonly cdr: ChangeDetectorRef) {}

    ngOnDestroy(): void {
        this.accountService.isInHomePage = false;
    }

    ngOnInit(): void {
        this.accountService.isInHomePage = true;
        this.cdr.detectChanges();
    }
}
