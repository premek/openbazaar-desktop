import $ from 'jquery';
import baseVw from '../baseVw';
import loadTemplate from '../../utils/loadTemplate';
import app from '../../app';
import { followedByYou, followUnfollow } from '../../utils/follow';
import Home from './Home';
import Store from './Store';
import Follow from './Follow';
import Reputation from './Reputation';

export default class extends baseVw {
  constructor(options = {}) {
    super(options);
    this.options = options;

    // the route will send a lower case tab value, convert it to upper case or Store if not sent
    this.tab = `${options.tab.charAt(0).toUpperCase()}${options.tab.slice(1)}` || 'Store';
    this.tabViewCache = {};
    this.tabViews = { Home, Store, Follow, Reputation };

    this.ownPage = this.model.id === app.profile.id;

    if (!this.ownPage) {
      this.followedByYou = followedByYou(this.model.id);

      // followsYou requires a new api call
      this.followsYou = false; // temp until api is available

      this.listenTo(app.ownFollowing, 'sync update', () => {
        this.followedByYou = followedByYou(this.model.id);
        if (this.followedByYou) {
          this.$followLbl.addClass('hide');
          this.$unfollowLbl.removeClass('hide');
        } else {
          this.$followLbl.removeClass('hide');
          this.$unfollowLbl.addClass('hide');
        }
      });

      this.listenTo(app.ownFollowers, 'update', () => {
        // if the page being viewed stops following the user change the followsYou message
        this.followsYou = app.ownFollowers.get(this.model.id) !== undefined;
        if (this.followsYou) {
          this.$followsYou.removeClass('hide');
        } else {
          this.$followsYou.addClass('hide');
        }
      });
    }

    this.listenTo(this.model, 'change', () => this.render());
  }

  className() {
    return 'userPage';
  }

  events() {
    return {
      'click .js-tab': 'tabClick',
      'click .js-followBtn': 'followClick',
      'click .js-messageBtn': 'messageClick',
      'click .js-moreBtn': 'moreClick',
    };
  }

  tabClick(e) {
    const targ = $(e.target).closest('.js-tab');
    this.selectTab(targ.attr('data-tab'));
  }

  followClick() {
    const type = this.followedByYou ? 'unfollow' : 'follow';

    followUnfollow(this.model.id, type);
  }

  messageClick() {
    // activate the chat message
    console.log('message');
  }

  moreClick() {
    this.$moreableBtns.toggleClass('hide');
  }

  selectTab(targ) {
    let tabTarg = targ;
    // if an invalid targ is passed in, set it to Store
    if (!this.tabViews[tabTarg] && tabTarg !== 'Following' && tabTarg !== 'Followers') {
      tabTarg = 'Store';
    }

    let tabView = this.tabViewCache[tabTarg];
    const tabOptions = { ownPage: this.ownPage, model: this.model };

    if (!this.currentTabView || this.currentTabView !== tabView) {
      this.$tabTitle.text(tabTarg);

      // subRoute is anything after the tab in the route, which is something
      // we want to maintain, e.g:
      // <guid>/<tab>/<slug>/<blah>
      // the subRoute is '/<slug>/<blah>'
      const subRoute = location.hash
        .slice(1)
        .split('/')
        .slice(2)
        .join('/');

      // add tab to history
      app.router.navigate(`${this.model.id}/${tabTarg.toLowerCase()}` +
        `${subRoute ? `/${subRoute}` : ''}`);

      this.$('.js-tab').removeClass('clrT active');
      this.$(`.js-tab[data-tab="${tabTarg}"]`).addClass('clrT active');

      if (tabTarg === 'Followers' || tabTarg === 'Following') {
        tabOptions.followType = tabTarg;
        tabTarg = 'Follow';
      }

      if (this.currentTabView) this.currentTabView.$el.detach();

      if (!tabView) {
        tabView = this.createChild(this.tabViews[tabTarg], tabOptions);
        this.tabViewCache[tabOptions.followType || tabTarg] = tabView;
        tabView.render();
      }

      this.$tabContent.append(tabView.$el);
      this.currentTabView = tabView;
    }
  }

  get $pageContent() {
    return this._$pageContent || this.$('.js-pageContent');
  }

  render() {
    loadTemplate('userPage/userPage.html', (t) => {
      this.$el.html(t({
        ...this.model.toJSON(),
        followed: this.followedByYou,
        followsYou: this.followsYou,
        ownPage: this.ownPage,
      }));

      this.$tabContent = this.$('.js-tabContent');
      this.$tabTitle = this.$('.js-tabTitle');
      this.$followLbl = this.$('.js-followLbl');
      this.$unfollowLbl = this.$('.js-unfollowLbl');
      this.$followsYou = this.$('.js-followsYou');
      this.$moreableBtns = this.$('.js-moreableBtn');
      this._$pageContent = null;

      this.tabViewCache = {}; // clear for re-renders
      this.selectTab(this.tab);
    });

    return this;
  }
}
