/**
 * Created by viktor on 10/13/2015.
 */
(function ($, w, d, undefined){
    $.widget("TextEditor",{
        /*********************************************************
         *                    VARIABLES                          *
         *********************************************************/
        options:
        {
            network: 'tumblr'
        },
        static:
        {
            formatDict:{
                'b':'bold',
                'i':'italic',
                'a':'link',
                'strike':'strikethrough'
            },
            formatValid:['b','i', 'a','s','strike'],
            facebook:['bold','italic'],//menu for facebook
            tumblr:['bold','italic','link','strikethrough']////menu for facebook
        },
        utils:
        {
            selection:{
                getText: function(){
                    var txt = '';
                    if (w.getSelection) {
                        txt = w.getSelection().toString();
                    }
                    else if (d.getSelection) {
                        txt = d.getSelection().toString();
                    }
                    else if (d.selection) {
                        txt = d.selection.createRange().text;
                    }
                    return txt;
                },
                getSelection: function () {
                    if (w.getSelection) {
                        return w.getSelection();
                    }
                    else if (d.selection && d.selection.createRange) { // IE
                        return d.selection;
                    }
                    return null;
                },
                save: function () {
                    if (w.getSelection) {
                        var sel = w.getSelection();
                        if (sel.rangeCount > 0) {
                            return sel.getRangeAt(0);
                        }
                    } else if (d.selection && d.selection.createRange) { // IE
                        return d.selection.createRange();
                    }
                    return null;
                },
                restore: function (range) {
                    if (range) {
                        if (w.getSelection) {
                            var sel = w.getSelection();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        }
                        // IE
                        else if (d.selection && range.select) {
                            range.select();
                        }
                    }
                },
                getContainer: function (sel) {
                    if (w.getSelection && sel && sel.commonAncestorContainer) {
                        return sel.commonAncestorContainer;
                    }
                    else if (d.selection && sel && sel.parentElement) {
                        return sel.parentElement();
                    }
                    return null;
                }
            },
            keyboard: {
                isEnter: function (e, callback) {
                    if (e.which === 13) {
                        callback();
                    }
                }
            },
            validation: {
                isUrl: function (url) {
                    //return (/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/).test(url);
                    //var re = ;
                    var regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
                    if(!regex .test(url)) {
                        alert("Please enter valid URL.");
                        return false;
                    } else {
                        return true;
                    }
                }
            }
        },
        events:
        {
            commands:
            {
                bold: function(e)
                {
                    e.preventDefault();
                    d.execCommand('bold', false, null);
                },
                italic: function(e)
                {
                    e.preventDefault();
                    d.execCommand('italic', false);
                },
                link: function(e)
                {
                    e.preventDefault();
                    this._hideButtons.call(this);
                    this._showLinkInput.call(this);
                },
                createLink: function(e, s)
                {
                    this.utils.selection.restore(s);
                    d.execCommand('createLink', false, e.url);
                    this._restoreMenuButtons();
                },
                removeLink: function(e, selection)
                {
                    var el = $(this.utils.selection.getContainer(selection)).closest('a');
                    el.contents().first().unwrap();
                    this._restoreMenuButtons();
                },
                strikethrough: function(e,s)
                {
                    e.preventDefault();
                    d.execCommand('strikeThrough', false);
                }
            },
            change: function(e)
            {
            },
            paste: function(e)
            {
                var that = $(this);
                if (e.clipboardData)
                    text = e.clipboardData.getData('text/plain');
                else if (window.clipboardData)
                    text = window.clipboardData.getData('Text');
                else if (e.originalEvent.clipboardData)
                    text = $('<div></div>').text(e.originalEvent.clipboardData.getData('text'));

                if (document.queryCommandSupported('insertText')) {
                    document.execCommand('insertHTML', false, $(text).html());
                    return false;
                }
                else
                { // IE > 7
                    that.find('*').each(function () {
                        $(this).addClass('within');
                    });
                    setTimeout(function () {
                        that.find('*').each(function () {
                            // http://api.jquery.com/unwrap/
                            $(this).not('.within').contents().unwrap();
                        });
                    }, 1);
                }
            },
            mouseUp: function(e, isDocument){
                var self = this;
                setTimeout(function(){
                    //var s = self.utils.selection.save();
                    var s = self.utils.selection.getSelection();
                    if($.trim(s)!=""){
                        if(s.collapsed){
                            if(!isDocument){
                                //self.menu.hide.call(self, e);
                            }
                        }else{
                            self.showMenu.call(self, e);
                        }
                    }
                }, 50);
            }
        },
        /*********************************************************
         *                    CREATE WIDGET                      *
         *********************************************************/
        _create: function()
        {
            var self = this;
            this._initMenu();
            this._bindEvents();
        },
        _setOption: function(key, value)
        {
            switch (key) {
                case "network":
                    this.options.network = value;
                    break;
                default:
                    return;
                    break;
            }
            $.Widget.prototype._setOption.apply(this, arguments);
        },
        _initMenu: function()
        {
            var self = this;
            if(!$(self.element).next().is('#nav-'+self.uuid)){
                self.menuTag = $("<div/>").addClass('editor-nav editor-nav-bubble').attr('id','nav-'+self.uuid);
                var $menuUL = $("<ul>");
                var menuItems = self.static[self.options.network];
                //BUILD MENU, ACTIONS BUTTONS
                $.each(menuItems, function(i,n){
                    var $li = $('<li>', {class: 'editor-menu-item'});
                    var $i = $('<i>');
                    var $a = $("<button>", {class: 'unselectable editor-btn-'+n}).attr({unselectable:'on','data-node': n}).click(function(e){
                        e.preventDefault();
                        self.events.commands[n].call(self, e);
                    });
                    $li.append($a);
                    $menuUL.append($li);
                });
                self.menuTag.append($menuUL);
                $(self.element).after(self.menuTag);

                //CREATE LINK WRAPPER
                self.linkWrapper = $("<div/>").addClass("linkWrapper");

                $("<span/>")
                    .text("| Attach")
                    .on('click', function(e){
                        self._saveLink(e);
                    })
                    .appendTo(self.linkWrapper);

                self.linkInput = $("<input/>")
                    .attr({placeholder:"Add source URL",type: "text"})
                    .appendTo(self.linkWrapper);

                self.linkInput.on('keydown', function(e){
                    self.utils.keyboard.isEnter(e, function() {
                        e.preventDefault();
                        self._saveLink(e);
                    });
                }).on('paste', function(e){
                    setTimeout(function(){
                        var text = self.linkInput.val();
                        if (/http:\/\/https?:\/\//.test(text))
                        {
                            text = text.substring(7);
                            self.linkInput.val(text);
                        }
                    }, 1);
                });
                self.menuTag.append(self.linkWrapper);

                //CREATE LINK EDIT MENU
                self.editLinkWrapper = $("<div/>")
                    .addClass("editLinkWrapper")
                    .attr('id','editLinkWrapper-'+self.uuid);

                self.editLinkMenu = $("<div/>")
                    .addClass("editLinkMenu")
                    .attr('id','editLinkMenu-'+self.uuid)
                    .appendTo(self.editLinkWrapper);

                $("<span/>")
                    .text("Edit")
                    .on('click', function(e){
                        self._editLinkUrl.call(self);
                    })
                    .appendTo(self.editLinkMenu);

                $("<span/>")
                    .text("Remove")
                    .on('click', function(e){
                        self._removeLink();
                    })
                    .appendTo(self.editLinkMenu);

                $("<span/>")
                    .text("Open")
                    .on('click', function(e){
                        w.open($(self._currentLink).attr('href'), '_black');
                    })
                    .appendTo(self.editLinkMenu);

                /*edit link input*/
                self.editLinkInputWrapper = $("<div/>")
                    .addClass('editLinkInputWrapper')
                    .appendTo(self.editLinkWrapper);

                $("<span/>")
                    .text("| update")
                    .on('click', function(e){
                        self._updateLink.call(self);
                    })
                    .appendTo(self.editLinkInputWrapper);

                self.editLinkInput = $("<input/>")
                    .attr({placeholder:"http://",type: "text"})
                    .appendTo(self.editLinkInputWrapper);

                self.editLinkInput.on('keydown', function(e){
                    self.utils.keyboard.isEnter(e, function() {
                        e.preventDefault();
                        self._updateLink.call(self);
                    });
                }).on('paste', function(e){
                        setTimeout(function(){
                        var text = self.editLinkInput.val();
                        if (/http:\/\/https?:\/\//.test(text))
                        {
                            text = text.substring(7);
                            self.editLinkInput.val(text);
                        }
                    }, 1);
                });

                $(self.menuTag).after(self.editLinkWrapper);
            }
        },
        _bindEvents: function()
        {
            var self = this;
            $(this.element).on("mouseup", self.events.mouseUp.bind(self, false));
            $(document).on("mouseup", self.events.mouseUp.bind(self, true));
            $(this.element).bind('paste', self.events.paste);

            $(document).on('click', function(e){
                if($(e.target).closest('#nav-'+self.uuid).length === 0 && $(e.target).is("a")==false)
                {
                    $(self).trigger('hideMenu');

                    if($(e.target).closest('#editLinkWrapper-'+self.uuid).length===0)
                    {
                        if($(e.target).parents("a").length===0)
                        {
                            $(self).trigger('hideEditLinkMenu');
                        }
                    }
                }
            });

            $(this.element).on('click', "a", function(){
                self._currentLink = this;
                self._editLinkMenu.call(self);
            });

            $(self).on('hideMenu', function(){
                self.hideMenu.call(self);
            });

            $(self).on('hideEditLinkMenu', function(){
                self.editLinkWrapper.hide();
                self.editLinkInputWrapper.hide();
                self.editLinkWrapper.css("width", "");
            });
        },
        _checkForFormatting: function(currentNode, formats)
        {
            try{
                if(currentNode.nodeName == '#text' || this.static.formatValid.indexOf(currentNode.nodeName.toLowerCase()) != -1){
                    if (currentNode.nodeName != '#text')
                    {
                        formats.push(currentNode.nodeName.toLowerCase());
                    }
                    this._checkForFormatting(currentNode.parentNode, formats);
                }
            }catch(e){}
        },
        _updateMenuState: function()
        {
            var self = this,
                s = self.utils.selection.getSelection(),
                formats = [];
            self._checkForFormatting(s.focusNode, formats);
            self._cleanSelected();
            if(formats.length > 0)
            {
                $.each(formats, function(i,f)
                {
                    $(self.menuTag).find("button[data-node='"+self.static.formatDict[f]+"']").closest('li').addClass('btn-active');
                });
            }
        },
        _updateMenuPosition: function(editLink)
        {
            var self = this,
                pos={},
                sel = w.getSelection();
            //Edit link bubble position, we don't have a real selection
            //so we updating bubble position by clicked target

            if(editLink)
            {
                var selPos = $(sel.anchorNode.parentNode).position();
                pos.x = selPos.left;
                pos.y = selPos.top + 30;
            }
            else
            {
                var range = sel.getRangeAt(0),
                    boundary = range.getBoundingClientRect(),
                    offset = self.element.offset(),
                    pos = {
                        x: (boundary.left - (boundary.width / 2)) - offset.left,
                        y: (boundary.top - self.element.offset().top) + 30
                    };
                var right_wall_range = $(document).width() - boundary.left;
                var left_wall_range = $(self.element).offset().left - boundary.left;
                if(right_wall_range < self.menuTag.width())
                {
                    pos.x = $(self.element).width() - 120;
                }
                if(left_wall_range > -10)
                {
                    pos.x = 0;
                }
            }
            self.menuTag.css({left:pos.x,top:pos.y});
            self.editLinkWrapper.css({left:pos.x,top:pos.y});
        },
        _restoreMenuButtons: function()
        {
            this.menuTag.css("width", "");
            this.menuTag.find('.linkWrapper').hide().end().find('ul').show();
        },
        _hideButtons: function()
        {
            this.menuTag.find('ul').hide();
        },
        _cleanSelected: function()
        {
            this.menuTag.find('li').removeClass('btn-active');
        },
        _editLinkUrl: function()
        {
            var self = this,
                url = $(self._currentLink).attr('href');
            self.editLinkMenu.hide();
            self.editLinkInput.val(url);
            self.editLinkWrapper.width('200');
            self.editLinkInputWrapper.focus();
            self.editLinkInputWrapper.show();
        },
        _showLinkInput: function()
        {
            var self = this;
            self.savedSelection = self.utils.selection.save();
            self.menuTag.width('200');
            self._updateMenuPosition(false);
            self.linkWrapper.show();
            self.linkInput.val("");
            self.linkInput.focus();
        },
        _editLinkMenu: function()
        {
            var self = this;
            //self._updateMenuPosition();
            self.editLinkInputWrapper.hide();

            self.editLinkWrapper.width('');
            self._updateMenuPosition(true);
            self.hideMenu();
            self.editLinkWrapper.show();
            self.editLinkMenu.show();
        },
        _saveLink: function(e, selection)
        {
            var self = this;
            var hasLink = self.menuTag.find("button[data-node='link']").hasClass('btn-active'),
                url = self.linkInput.val();

            var pattern = /^((http|https|ftp):\/\/)/;
            if(!pattern.test(url)){
                url = "http://" + url;
            }
            if (self.utils.validation.isUrl(url)==true)
            {

                e.url = url;
                self.events.commands.createLink.call(self, e, self.savedSelection);
            }
        },
        _removeLink: function()
        {
            var el = $(this._currentLink);
            el.contents().first().unwrap();
            $(self).trigger('hideEditLinkMenu');
        },
        _updateLink: function()
        {
            var val = this.editLinkInput.val();
            if($.trim(val)=="")
            {
                $(this).trigger('hideEditLinkMenu');
                return;
            }

            var pattern = /^((http|https|ftp):\/\/)/;
            if(!pattern.test(val)){
                val = "http://" + val;
            }

            if(this.utils.validation.isUrl(val))
            {
                $(this._currentLink).attr('href', val);
            }

            $(this).trigger('hideEditLinkMenu');
        },
        /*PUBLIC METHODS*/
        network: function (network)
        {
            if(network === undefined){
                return this.options.network;
            }
            this._setOption('network', network);
        },
        hideMenu: function()
        {
            this.menuTag.hide();
            this._restoreMenuButtons();
        },
        showMenu: function()
        {
            var self = this;
            self._updateMenuPosition();
            self._updateMenuState();
            self.menuTag.show();
            self.editLinkWrapper.hide();
        },
        showButtons: function()
        {
            self.menuTag.css("width", "");
            self.menuTag.find('.linkWrapper').remove().end().find('ul').show();
        },

        getContent: function (){
            return $(this.element).html();
        }
    });
})(jQuery, window, document);