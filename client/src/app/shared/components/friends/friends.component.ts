import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AccountService } from '@app/core/http/services/account-service/account.service';
import { AccountListenerService } from '@app/core/services/account-listener/account-listener.service';
import { AccountFriend } from '@app/core/interfaces/account/account_friends';
import { AppMaterialModule } from '@app/modules/material.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FRIENDS_EN, FRIENDS_FR } from '@app/core/constants/constants';
import { Subscription } from 'rxjs';
import { CancelConfirmationService } from '@app/core/services/cancel-confirmation/cancel-confirmation.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { FriendsFacadeService, FriendsViewModel } from '@app/core/services/friends/friends-facade.service';
import { FriendRequestData } from '@app/core/interfaces/friend-request-data';

/**
 * Presentational friend panel component.
 *
 * All heavy relation/state logic stays in FriendsFacadeService and
 * AccountListenerService; this component focuses on rendering and user actions.
 */
export enum FriendTab {
    Discover = 'discover',
    Friends = 'friends',
    Requests = 'requests',
    Blocked = 'blocked',
}

@Component({
    selector: 'app-friends',
    standalone: true,
    imports: [CommonModule, FormsModule, MatFormFieldModule, AppMaterialModule, TranslateModule],
    templateUrl: './friends.component.html',
    styleUrls: ['./friends.component.scss'],
    animations: [
        trigger('listAnimation', [
            transition('* => *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(8px)' }),
                    stagger(40, [
                        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
                    ]),
                ], { optional: true }),
            ]),
        ]),
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 })),
            ]),
        ]),
        trigger('cardEnter', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.95)' }),
                animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
            ]),
        ]),
    ],
})
export class FriendsComponent implements OnInit, OnDestroy {
    readonly FriendTab = FriendTab;

    // Local UI state (view mode + search value).
    tabs: string[];
    currentTab: FriendTab = FriendTab.Friends;
    searchTerm: string = '';

    // Data slices bound directly by template.
    filteredDiscoverList: AccountFriend[] = [];
    filteredFriendsList: AccountFriend[] = [];
    blockedUsersList: AccountFriend[] = [];
    friendRequestsList: FriendRequestData[] = [];
    friendCount = 0;
    requestCount = 0;
    blockedCount = 0;

    private langChangeSubscription: Subscription;
    private viewModelSubscription: Subscription;
    constructor(
        public accountService: AccountService,
        public accountListenerService: AccountListenerService,
        private readonly friendsFacadeService: FriendsFacadeService,
        private translateService: TranslateService,
        public cancelConfirmationService: CancelConfirmationService,
    ) {
        this.updateLanguageDependentProperties();
    }

    ngOnInit(): void {
        // 1) HTTP bootstrap
        this.friendsFacadeService.initializeData().subscribe(() => {
            this.friendsFacadeService.setSearchTerm(this.searchTerm);
        });
        // 2) websocket live updates
        this.accountListenerService.setUpListeners();

        this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => {
            this.updateLanguageDependentProperties();
        });

        // 3) bind reactive view model to template-facing fields
        this.viewModelSubscription = this.friendsFacadeService.viewModel$.subscribe((viewModel: FriendsViewModel) => {
            this.applyViewModel(viewModel);
        });
    }

    ngOnDestroy(): void {
        if (this.langChangeSubscription) {
            this.langChangeSubscription.unsubscribe();
        }
        if (this.viewModelSubscription) {
            this.viewModelSubscription.unsubscribe();
        }
    }

    get tabLabel(): { discover: string; friends: string; requests: string; blocked: string } {
        const isFrench = this.translateService.currentLang === 'fr';
        return {
            discover: isFrench ? FRIENDS_FR.discover : FRIENDS_EN.discover,
            friends: isFrench ? FRIENDS_FR.friends : FRIENDS_EN.friends,
            requests: isFrench ? FRIENDS_FR.friendRequest : FRIENDS_EN.friendRequest,
            blocked: isFrench ? FRIENDS_FR.blocked : FRIENDS_EN.blocked,
        };
    }

    // Rebuilds tab labels when language changes.
    updateLanguageDependentProperties(): void {
        const isFrench = this.translateService.currentLang === 'fr';
        this.tabs = isFrench
            ? [FRIENDS_FR.discover, FRIENDS_FR.friends, FRIENDS_FR.friendRequest]
            : [FRIENDS_EN.discover, FRIENDS_EN.friends, FRIENDS_EN.friendRequest];
    }

    switchTab(tab: FriendTab): void {
        this.currentTab = tab;
        this.refreshFilteredLists();
    }

    // Search is applied reactively by the facade's view-model stream.
    onSearchInput(): void {
        this.friendsFacadeService.setSearchTerm(this.searchTerm);
    }

    clearSearch(): void {
        this.searchTerm = '';
        this.friendsFacadeService.setSearchTerm(this.searchTerm);
    }

    // Legacy UI hook kept for tab changes after moving filtering to the facade stream.
    refreshFilteredLists(): void {
        this.friendsFacadeService.setSearchTerm(this.searchTerm);
    }

    getFilteredList(): AccountFriend[] {
        if (this.currentTab === FriendTab.Discover) {
            return this.filteredDiscoverList;
        }
        if (this.currentTab === FriendTab.Friends) {
            return this.filteredFriendsList;
        }
        return [];
    }

    getRequestForUser(userId: string) {
        return this.friendsFacadeService.getRequestForUser(userId);
    }

    getOfflineElapsedLabel(account: AccountFriend): string {
        const lastSeenDate = this.parseTimestamp(account.lastSeenAt);
        if (!lastSeenDate) {
            return this.translateService.currentLang === 'fr' ? 'hors ligne' : 'offline';
        }
        return this.formatRelativeTimeCompact(lastSeenDate);
    }

    // Command handlers: each intent delegates to facade + optionally asks confirmation.
    sendFriendRequest(userId: string): void {
        this.friendsFacadeService.sendFriendRequest(userId).subscribe(() => {
            this.friendsFacadeService.setSearchTerm(this.searchTerm);
        });
    }

    cancelFriendRequest(receiverId: string, pseudonym: string): void {
        const dialogMessage =
            this.translateService.currentLang === 'fr'
                ? `annuler la demande d'ami envoyée à ${pseudonym}`
                : `cancel the friend request sent to ${pseudonym}`;

        this.cancelConfirmationService.askConfirmation(() => {
            this.friendsFacadeService.cancelFriendRequest(receiverId).subscribe(() => {
                this.friendsFacadeService.setSearchTerm(this.searchTerm);
            });
        }, dialogMessage);
    }

    acceptFriendRequest(requestId: string): void {
        this.friendsFacadeService.acceptFriendRequest(requestId).subscribe(() => {
            this.friendsFacadeService.setSearchTerm(this.searchTerm);
        });
    }

    rejectFriendRequest(requestId: string): void {
        this.friendsFacadeService.rejectFriendRequest(requestId).subscribe(() => {
            this.friendsFacadeService.setSearchTerm(this.searchTerm);
        });
    }

    removeFriend(friendId: string, pseudonym: string): void {
        const dialogMessage =
            this.translateService.currentLang === 'fr'
                ? `retirer ${pseudonym} de vos amis`
                : `remove ${pseudonym} from your friends`;

        this.cancelConfirmationService.askConfirmation(() => {
            this.friendsFacadeService.removeFriend(friendId).subscribe(() => {
                this.friendsFacadeService.setSearchTerm(this.searchTerm);
            });
        }, dialogMessage);
    }

    blockNormalUser(blockedUserId: string, pseudonym: string): void {
        const dialogMessage =
            this.translateService.currentLang === 'fr'
                ? `bloquer ${pseudonym}`
                : `block ${pseudonym}`;

        this.cancelConfirmationService.askConfirmation(() => {
            this.friendsFacadeService.blockNormalUser(blockedUserId).subscribe(() => {
                this.friendsFacadeService.setSearchTerm(this.searchTerm);
            });
        }, dialogMessage);
    }

    blockFriend(blockedFriendId: string, pseudonym: string): void {
        const dialogMessage =
            this.translateService.currentLang === 'fr'
                ? `bloquer votre ami ${pseudonym}`
                : `block your friend ${pseudonym}`;

        this.cancelConfirmationService.askConfirmation(() => {
            this.friendsFacadeService.blockFriend(blockedFriendId).subscribe(() => {
                this.friendsFacadeService.setSearchTerm(this.searchTerm);
            });
        }, dialogMessage);
    }

    blockUserWithPendingRequest(otherUserId: string, pseudonym: string): void {
        const dialogMessage =
            this.translateService.currentLang === 'fr'
                ? `bloquer ${pseudonym}`
                : `block ${pseudonym}`;

        this.cancelConfirmationService.askConfirmation(() => {
            this.friendsFacadeService.blockUserWithPendingRequest(otherUserId).subscribe(() => {
                this.friendsFacadeService.setSearchTerm(this.searchTerm);
            });
        }, dialogMessage);
    }

    unblockUser(blockedUserId: string, pseudonym: string): void {
        const dialogMessage =
            this.translateService.currentLang === 'fr'
                ? `débloquer ${pseudonym}`
                : `unblock ${pseudonym}`;

        this.cancelConfirmationService.askConfirmation(() => {
            this.friendsFacadeService.unblockUser(blockedUserId).subscribe(() => {
                this.friendsFacadeService.setSearchTerm(this.searchTerm);
            });
        }, dialogMessage);
    }

    // Centralized assignment from reactive VM to component fields used by template.
    private applyViewModel(viewModel: FriendsViewModel): void {
        this.filteredDiscoverList = viewModel.discoverList;
        this.filteredFriendsList = viewModel.friendsList;
        this.blockedUsersList = viewModel.blockedList;
        this.friendRequestsList = viewModel.requestList;
        this.friendCount = viewModel.friendCount;
        this.requestCount = viewModel.requestCount;
        this.blockedCount = viewModel.blockedCount;
    }

    private parseTimestamp(rawValue: string | null): Date | null {
        if (!rawValue) {
            return null;
        }
        const parsed = new Date(rawValue);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }

        const match = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}):(\d{2}):(\d{2})(?:\s*(AM|PM))?$/i);
        if (!match) {
            return null;
        }

        const month = Number(match[1]);
        const day = Number(match[2]);
        const year = Number(match[3]);
        let hours = Number(match[4]);
        const minutes = Number(match[5]);
        const seconds = Number(match[6]);
        const meridiem = match[7]?.toUpperCase();

        if (meridiem === 'PM' && hours < 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }

        return new Date(year, month - 1, day, hours, minutes, seconds);
    }

    private formatRelativeTimeCompact(lastSeenDate: Date): string {
        const elapsedMs = Date.now() - lastSeenDate.getTime();
        const safeElapsedMs = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
        const elapsedMinutes = Math.floor(safeElapsedMs / 60000);
        const isFrench = this.translateService.currentLang === 'fr';

        if (elapsedMinutes < 1) {
            return isFrench ? "à l'instant" : 'now';
        }
        if (elapsedMinutes < 60) {
            return `${elapsedMinutes}m`;
        }
        const elapsedHours = Math.floor(elapsedMinutes / 60);
        if (elapsedHours < 24) {
            return `${elapsedHours}h`;
        }
        const elapsedDays = Math.floor(elapsedHours / 24);
        return `${elapsedDays}${isFrench ? 'j' : 'd'}`;
    }
}
