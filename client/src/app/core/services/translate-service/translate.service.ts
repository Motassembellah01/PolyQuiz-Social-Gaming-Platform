import { Injectable } from '@angular/core';
import { Language } from '@app/core/constants/constants';
import { AccountService } from '@app/core/http/services/account-service/account.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})

export class TranslationService {
    constructor(
        public readonly translateService: TranslateService,
        private readonly accountService: AccountService,
    ) {}

    changeLang(lang?: Language) {
        const switchLang: Language = this.translateService.currentLang === Language.FR ? Language.EN : Language.FR;
        const selectedLang = lang ?? switchLang;

        this.translateService.use(selectedLang).subscribe();

        this.accountService.changeLang(selectedLang).subscribe((account) => {
            this.accountService.account = account;
        });
    }
}