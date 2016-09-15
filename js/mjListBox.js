$(document).ready(function() {

// reference:
    // http://learn.jquery.com/plugins/basic-plugin-creation/

/*
    parameters:
   
    items: [],                  array of item objects
    type: "text",               text, checkbox, radiobutton. 
    multi_select: false,        if true can select multiple items when type set to text
    component_order: ["button", "image", "text"]
    max_text_width: null,           for elispses or positioning buttons and images on the right specify a text width
    itemRender: null,           custom render function
    dragdrop: false,
    enable_hover: true,
    horizontal: false,
    wrap_text: false,
    virtual_mode: false,
    page_size: 15                if virtual_mode is true we need thisch

    stack_components:            true|false default: false
   
    Properties common to all controls
   
    width: 'auto',
    height: 'auto',
    disabled: false,
    theme: null
   
    Data item structure:
   
    id: string
    text:                       can be a function
    selected: true,false,1,0    (only used if type is not checkbox or radiobutton)
    checked: 0,1,2          (0: not checked, 1: checked, 2: half ticked, only used if type is checkbox or radiobutton)
    disabled: true,false,1,0
    image: null
   
    TBD:
   
    allow function for item text field
    implement disabled
    implement themes
    _enableKeyEvents
    wrap_text: true/false (if true item can span many lines, if false ellipse text)
   
    */
    
(function ($) {

    var mjListBox = {

        _init: function (options, el) {

            this.widget_class = "mjListBox";

            this.el = el;
            this.$el = $(el);

            this.original_data = [];
            this.start = 0;
            this.visible_items = [];     // items visible after filtering

            // plugin have been applied previously, blow away any existing instance

            this.close();

            this._validateData(options);

            this._render();

            this.saveState();

            this._startListening();

            return this;
        },

        _renderItemButton: function(o)
        {
            // render the checkbox or radio button

            var str = "";

            if (!this.isCheckable())
                return str;

            var s = this.settings;

            var x = "";

            switch (o.checked) {
                case 1: x = " checked"; break;
                case 2: x = " half-ticked"; break;
            }

            switch (s.type) {
                case "checkbox":
                    str = "<div class='mj-cell mj-checkbox-cell'><div class='mj-checkbox-box" + x + "'><div class='mj-tick'></div></div></div>";
                    break;

                case "radiobutton":
                    str = "<div class='mj-cell mj-radio-cell'><div class='mj-radio" + x + "'><div class='mj-dot'></div></div></div>";
                    break;
            }

            return str;
        },

        _renderImage: function(o)
        {
            if (!o.image)
                return "";

            return "<div class='mj-cell mj-image-cell'><div class='mj-image'><img src='" + o.image + "' /></div></div>";
        },

        _renderText: function(o)
        {
            var s = this.settings;

            var str = "";

            if (s.itemRender) {

                // custom render, if itemRender is provided the text is replaced by the output of the itemRender
                
                str += "<div class='mj-cell'>" + s.itemRender(o) + "</div>";
            }
            else {

                var text = o.text;
                var title = String(o.text);

                if ($.isFunction(o.text)) {
                    text = o.text();
                    title = "";
                }

                if (title.indexOf("<") > -1)        // title cannot be html expression
                    title = "";

                if (s.wrap_text)
                    str += "<div class='mj-cell mj-text-cell'><div class='mj-text' title='" + title + "'>" + text + "</div></div>";
                else
                    str += "<div class='mj-cell mj-text-cell'><div class='mj-text mj-nowrap' title='" + title + "'>" + text + "</div></div>";
            }

            return str;
        },
        
        _renderItem: function (o, index) {

            var s = this.settings;

            var str = "<div class='mj-row' tabindex=" + 1 + " >";       // ths tabindex is so we can use the up,down arrow keys

            for (var i = 0; i < s.component_order.length; i++)
            {
                switch (s.component_order[i])
                {
                    case "button": str += this._renderItemButton(o); break;
                    case "image": str += this._renderImage(o); break;
                    case "text": str += this._renderText(o); break;
                }
            }

            str += "</div>";

            var e = $(str);      // convert to jquery selector

            if (o.disabled)
                e.addClass("mj-disabled");                   // can be disabled and selected

            // cant select items in a checkbox or radiobutton list

            if (o.selected && !this.isCheckable())
                e.addClass("mj-selected");

            // attach some data

            e.data("d", o);            

            return e;
        },

        _redraw: function () {

            var self = this;          

            var s = this.settings;

            var e = this.$el.find(".mj-table");

            e.empty();

            // need this loop to be fast
            // index goes up by 100 in case we insert new row
            // dont want to rewrite all the tabindexes again 
            
            if (s.virtual_mode) {
                
                for (var i = this.start, len = this.visible_items.length; i < this.start + s.page_size && i < len; i++)
                {
                    var o = this.visible_items[i];

                    e.append(self._renderItem(o, i * 100));
                }
            }
            else {
                $.each(this.visible_items, function (index, o) { e.append(self._renderItem(o, index * 100)); });
            }
        },

        _createHorizontalScrollBar: function (val)
        {
            var self = this;

            var s = this.settings;

            var t = this.$el.find(".mj-listbox");

            var container_width = t.width();

            var w = this.$el.find(".mj-table").width();

            // table is wider than container, create horizontal scrollbar

            var create_horizontal_scrollbar = (w > container_width);

            // number of items is greater than page size, create vertical scrollbar

            var create_vertical_scrollbar = (this.visible_items.length > s.page_size);

            var e = this.$el.find(".mj-horizontal-scrollbar-container");

            if (create_horizontal_scrollbar) {

                // create horizontal scrollbar

                //this.$el.find(".mj-listbox").css("overflow-x", "auto");  

                e.css({ right: s.scrollbar_width + "px", height: s.scrollbar_height });

                var settings = { min: 0, max: 0, orientation: "horizontal", page_size: s.page_size, width: s.scrollbar_width, height: s.scrollbar_height };

                var w = this.$el.find(".mj-table").width();

                if (val)
                    settings.value = val;

                if (create_vertical_scrollbar) {
                    e.css({ right: s.scrollbar_width + "px", height: s.scrollbar_height });
                    settings.max = w - container_width + s.scrollbar_width;
                }
                else {
                    e.css({ right: "0px", height: s.scrollbar_height });
                    settings.max = w - container_width;
                }

                e.mjScrollBar(settings);

                e.on("valueChanged", function (e, n) { self.$el.find(".mj-table").css("left", -n); });
            }
            else {

                // remove horizontal scrollbar

                var x = e.find(".mj-scrollbar");

                if (x.length)
                    e.mjScrollBar("close");
            }
        },

        _createVerticalScrollBar: function ()
        {
            var self = this;

            var s = this.settings;

            var t = this.$el.find(".mj-listbox");

            var container_width = t.width();

            var w = this.$el.find(".mj-table").width();

            // table is wider than container, create horizontal scrollbar

            var create_horizontal_scrollbar = (w > container_width);

            // number of items is greater than page size, create vertical scrollbar

            var create_vertical_scrollbar = (this.visible_items.length > s.page_size);

            var e = this.$el.find(".mj-vertical-scrollbar-container");

            if (create_vertical_scrollbar) {

                if (create_horizontal_scrollbar) 
                    e.css({ bottom: s.scrollbar_height + "px", width: s.scrollbar_width });                
                else
                    e.css({ bottom: "0px", width: s.scrollbar_width });

                e.mjScrollBar({ min: 0, max: this.visible_items.length - s.page_size, page_size: s.page_size, width: s.scrollbar_width, height: s.scrollbar_height });

                e.on("valueChanged", function (e, n) {

                    self.scrollToItemByIndex(n);

                    // recreate horizontal scrollbar

                    //var x = self.$el.find(".mj-horizontal-scrollbar-container .mj-scrollbar");

                    //var val = null;

                    //if (x.length) {
                    //    val = self.$el.find(".mj-horizontal-scrollbar-container").mjScrollBar("val");
                    //    console.log("val = " + val);
                    //}

                    self.$el.find(".mj-table").css("left", 0);

                    self._createHorizontalScrollBar();
                });
            }
            else {
                // remove vertical scrollbar

                var x = e.find(".mj-scrollbar");

                if (x.length)
                    e.mjScrollBar("close");
            }
        },

        _createScrollBars: function () {

            // dont create scrollbars for touch screens

            if (mjcore.isTouchScreen())
                return;

            var s = this.settings;

            if (!s.virtual_mode)
                return;

            this.$el.find(".mj-listbox").css("overflow", "hidden");

            this._createVerticalScrollBar();

            this._createHorizontalScrollBar();
        },

        _render: function () {

            var self = this;

            var s = this.settings;

            var widget = $("<div>", { 'class': 'mj-widget mj-listbox' });

            //var t = $("<div>", { 'class': 'mj-table-container' });

            var table_el = $("<div>", { 'class': 'mj-table' });

            if (s.horizontal)
                table_el.addClass("mj-horizontal");

            //t.append(table_el);

            widget.append(table_el);

            this.$el.html(widget);

            this._redraw();

            if (s.virtual_mode) {

                var vertical_scrollbar = $("<div>", { 'class': 'mj-vertical-scrollbar-container' });
                var horizontal_scrollbar = $("<div>", { 'class': 'mj-horizontal-scrollbar-container' });

                widget.append(vertical_scrollbar);

                widget.append(horizontal_scrollbar);

                this._createScrollBars();
            }

           
            if (s.max_text_width)
                this.$el.find(".mj-text").css({ width: s.max_text_width });

            if (!mjcore.isEmpty(s.width) && s.width != "auto")
                this.$el.find(".mj-widget").css("width", s.width);

            if (!mjcore.isEmpty(s.height) && s.height != "auto")
                this.$el.find(".mj-widget").css("height", s.height);            

            return this;
        },

        _validateItem: function(o)
        {
            var default_item = {
                id: null,
                text: "",
                image: null,
                selected: false,
                checked: 0,
                disabled: false,
                visible: true
            };

            var x = $.extend({}, default_item, o);  // o overrides default

            $.extend(o, x);

            // we need an id for every item

            //if ( mjcore.isEmpty(o.id) )
            //    o.id = mjcore.generateId();

            if (this.isCheckable()) {

                switch (String(o.checked)) {

                    case "false": o.checked = 0; break;
                    case "true": o.checked = 1; break;
                    case "0": o.checked = 0; break;
                    case "1": o.checked = 1; break;
                    case "2": o.checked = 2; break;
                        break;

                    default:
                        o.checked = 0;
                        break;
                }

                o.selected = null;
            }
            else
            {
                switch (String(o.selected)) {

                    case "false": o.selected = false; break;
                    case "true": o.selected = true; break;
                    case "0": o.selected = false; break;
                    case "1": o.selected = true; break;
                    
                    default:
                        o.selected = false;
                }

                o.checked = null;
            }

            switch (String(o.disabled)) {

                case "false": o.disabled = false; break;
                case "true": o.disabled = true; break;
                case "0": o.disabled = false; break;
                case "1": o.disabled = true; break;              

                default:
                    o.disabled = false;
            }
        },

        _validateData: function (options) {

            var default_options = {
                items: [],                  // array of item obects
                type: "text",               // text, checkbox, radiobutton. 
                multi_select: false,        // if true can select multiple items when type set to text                
                max_text_width: null,       // for elispses or positioning buttons and images on the right specify a text width
                itemRender: null,           // custom render function
                dragdrop: false,
                enable_hover: true,
                horizontal: false,
                wrap_text: false,
                virtual_mode: false,
                page_size: 15,              // only used is virtual_mode is true
                component_order: ["button", "image", "text"],
                stack_components: false,    // true|false default: false
                scrollbar_height: mjcore.MJ_HORIZONTAL_SCROLLBAR_HEIGHT,
                scrollbar_width: mjcore.MJ_VERTICAL_SCROLLBAR_WIDTH,

                // properties common to all controls

                width: 'auto',
                height: 'auto',
                disabled: false,
                theme: null
            };

            this.settings = $.extend({}, default_options, options);  // options overrides default

            var s = this.settings;
            
            s.type = mjcore.validateString(s.type, ["text", "checkbox", "radiobutton"], default_options.type);
            s.multi_select = mjcore.validateBool(s.multi_select, default_options.multi_select);
            s.dragdrop = mjcore.validateBool(s.dragdrop, default_options.dragdrop);
            s.enable_hover = mjcore.validateBool(s.enable_hover, default_options.enable_hover);            
            s.horizontal = mjcore.validateBool(s.horizontal, default_options.horizontal);
            s.virtual_mode = mjcore.validateBool(s.virtual_mode, default_options.virtual_mode);
            s.stack_components = mjcore.validateBool(s.stack_components, default_options.stack_components);
            s.page_size = mjcore.validateInt(s.page_size, null, default_options.page_size);

            var self = this;

            var map = {};

            this.visble_items = [];

            $.each(s.items, function (index, o) {

                self._validateItem(o);

                self.visible_items.push(o);

                if (o.id != null) {

                    // if use ids they should be unique

                    if (map[o.id])
                        mjcore.mjError("mjListBox Error: duplicate id: " + o.id + " found in data. Ids must be unique.");

                    map[o.id] = o.id;
                }
            });
        },

        _startListening: function () {

            var self = this;

            var s = this.settings;

            this._stopListening();

            if (s.enable_hover) {

                this.$el.find(".mj-row").hover(
                  function () {
                      $(this).addClass("mj-hover");
                  }, function () {
                      $(this).removeClass("mj-hover");
                  }
                );
            }

            if (s.virtual_mode) {
                                               
                if (mjcore.isTouchScreen()) {

                    // on touch screens enable touch scrolling

                    //this.el.addEventListener("touchstart", function (e) { self._touchstart(e, self); }, false);
                    //this.el.addEventListener("touchmove", function (e) { self._touchmove(e, self); }, false);
                    //this.el.addEventListener("touchstart", function (e) { self._touchend(e, self); }, false);

                    this.$el.on('touchstart', this, this._touchstart);
                    this.$el.on('touchmove', this, this._touchmove);
                    this.$el.on('touchend', this, this._touchend);
                }
                else
                {
                    this.$el.on('mousewheel DOMMouseScroll wheel', ".mj-row", function (e) {

                        e.preventDefault();

                        var n = self.start;

                        if (e.originalEvent.wheelDelta > 0)
                            n--;
                        else
                            n++;

                        if (n >= 0 && n < s.items.length) {

                            self.scrollToItemByIndex(n);
                            e = self.$el.find(".mj-vertical-scrollbar-container");
                            e.mjScrollBar("set", n);
                        }
                    });

                    //var e = this.$el.find(".mj-listbox");
                    //e.scroll(function () {
                    //    console.log(e.scrollTop());
                    //});
                }
            }
                

            this.$el.on("click", ".mj-image", function (e) {

                e.preventDefault();
                //e.stopPropagation();

                var x = $(e.currentTarget).closest(".mj-row");

                // x.data() will get data for the whole element including the action

                self.$el.trigger("imageClick", x.data());
            });

            this.$el.on("click", ".mj-row", function (e) {

                e.preventDefault();
                e.stopPropagation();

                var ee = $(e.currentTarget);

                var o = ee.data("d");

                if (!o) {
                    mjcore.mjError("mjListBox: item click: item data not found");
                    return;
                }

                if (o.disabled)         // cant click on disabled item
                    return;

                switch (s.type)
                {
                    case "checkbox":
                    case "radiobutton":

                        self.toggle(o);
                        self.$el.trigger("checkChange", o);
                        break;

                    default:

                        self.select(o);
                        self.$el.trigger("selected", o);
                        break;
                }
            });

            if (s.dragdrop) {

                this.$el.find(".mj-listbox .mj-table").sortable({

                    update: function (event, ui) {

                        // refill the data array

                        s.items = [];

                        $.each(self.$el.find(".mj-row"), function (index, o) {

                            var x = $(o).data("d");
                            s.items.push(x);
                        });

                        self.$el.trigger("dragend");
                    }
                });
            }

            this._enableKeyEvents();
        },

        _touchstart: function(evt)
        {
            evt.preventDefault();       // need this otherwise the whole page scrolls
            //evt.stopPropagation();

            var self = evt.data;

            var e = evt.originalEvent;
            var y = 0;

            if (e.touches)
                y = e.touches[0].pageY;
            else
                y = e.pageY;

            self.touch_y = y;

            self.touch_busy = false;
        },

        _touchmove: function(evt)
        {
            //var self = this;
            var self = evt.data;

            var s = self.settings;

            //if (self.touch_busy == false)
            //    evt.preventDefault();

            //evt.stopPropagation();

            //console.log("touchmove");

            var e = evt.originalEvent;

            var y = 0;

            if (e.touches)
                y = e.touches[0].pageY;
            else
                y = e.pageY;

            if (y == self.touch_y)
                return;         // no change

            if (self.touch_busy)      // still drawing
                return;

            var h = self.$el.height();

            var delta = (y - self.touch_y);          // change

            var t = delta / h;         // % change can be -ve

            self.touch_y = y;

            var n = s.items.length;			// number of items 

            y = self.start + Math.floor((n - s.page_size) * t);

            if (y < 0 || y >= n)
                return;

            self.touch_busy = true;

            //window.setTimeout(function () {

            var str = self.scrollToItemByIndex(y);

            //}, 0);

            self.touch_busy = false;
        },

        _touchend: function(evt)
        {
            //evt.preventDefault();

            var self = evt.data;

            self.touch_busy = false;
        },

        _enableKeyEvents: function () {

            var self = this;

            // assumes list is made of list items

            var s = this.settings;

            this.$el.on("keydown", "li", function (e) {                

                var key = e.keyCode;
                var target = $(e.currentTarget);

                //self.$el.find("li").removeClass("mj-hover");

                var KEY_SPACE = 32;
                var KEY_UP = 38;
                var KEY_DOWN = 40;

                switch (key) {

                    case KEY_SPACE:

                        e.preventDefault();

                        var o = $(target).data("d");

                        if (o)
                            self.toggle(o);
                        
                        break;

                    case KEY_UP: // arrow up

                        e.preventDefault();

                        setTimeout(function () { target.prev().focus(); }, 0);     // jquery .focus() not working on firefox

                        var ee = $(target.prev());

                        var o = $(target.prev()).data("d");

                        if (o) {

                            if (!self.isCheckable()) {
                                //self.deselectAll();
                                self.select(o);
                            }

                            self.$el.trigger("arrowIn", o);
                        }

                        break;

                    case KEY_DOWN: // arrow down

                        e.preventDefault();

                        setTimeout(function () { target.next().focus(); }, 0);      // jquery .focus() not working on firefox

                        var ee = $(target.next());

                        var o = $(target.next()).data("d");

                        if (o) {

                            if (!self.isCheckable()) {
                                //self.deselectAll();
                                self.select(o);
                            }

                            self.$el.trigger("arrowIn", o);
                        }

                        break;
                }
            });

            //this.$el.on("focusin", "li", function (e) {

            //});

            this.$el.on("focusout", "li", function (e) {

                //$(e.currentTarget).removeClass("mj-hover");
            });

            // select the 1st selected or checked

            var n = -1;

            //var items = this.toArray();

            var n = mjcore.findIndex(s.items, function(o) { return (o.selected || o.checked == 1); });

            //for (var i = 0, len = items.length; i < len; i++)
            //{
            //    var o = items[i];

            //    if (o.selected || o.checked == 1)
            //    {
            //        n = i;
            //        break;
            //    }
            //}

            if (n != -1) {

                if (this.$el.find("li:eq(" + n + ")")) {
                    setTimeout(function () { self.$el.find("li:eq(" + n + ")").focus(); }, 0);      // jquery .focus() not working on firefox
                }
            }
        },

        _stopListening: function()
        {
            this.$el.off();
        },

        //-----------------------------------------------------------------------------------
        // public methods

        getItemElement: function (o) {

            var rows = this.$el.find(".mj-row");

            for (var i = 0, len = rows.length; i < len; i++) {

                var e = $(rows[i]);

                if (e.data("d") == o)
                    return e;
            }

            return null;
        },

        getItemElementById: function (id) {

            if (id == null)
                return null;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            return this.getItemElement(o);
        },

        getItemElementByIndex: function(n)
        {
            if (n == null || n < 0 || n >= s.items.length)
                return null;

            var s = this.settings;

            var o = s.items[n];

            return this.getItemElement(o);
        },

        isCheckable: function ()
        {
            var s = this.settings;

            return (s.type == "checkbox" || s.type == "radiobutton");       
        },

        getItemById: function (id) {

            if (id == null)
                return null;

            var s = this.settings;

            return mjcore.find(s.items, function (o) { return o.id == id; });
        },

        getItemByIndex: function(n)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return null;

            return s.items[n];
        },

        getItems: function () {

            return this.settings.items;
        },

        getVisibleItems: function () {

            return this.visible_items;
        },

        search: function(callback)
        {
            var arr = [];

            if (!callback)
                return arr;

            var s = this.settings;
           
            $.each(s.items, function (index, o) {

                if (callback(o))
                    arr.push(o);
            });

            return arr;
        },

        filter: function (val, callback)
        {
            var self = this;

            var s = this.settings;

            // build an array of visible items
            // mark each node as visible or not using the user supplied filter function

            this.visible_items = [];

            if ((val == null) || (val === "") || (!s.filter && !callback)) {

                $.each(s.items, function (i, o) {

                    o.visible = true;
                    self.visible_items.push(o);
                });
            }
            else {

                $.each(s.items, function (i, o) {

                    // if a callback was provided use that

                    if (callback)
                        o.visible = callback(o, val);
                    else
                        o.visible = s.filter(o, val);

                    if (o.visible)
                        self.visible_items.push(o);
                });
            }

            this.start = 0;     // start from 0

            this._redraw();

            this._createScrollBars();

            return this.visible_items.length;
        },

        //-------------------------------------------------------------------------
        // checkbox and radiobutton functions

        toggle: function(o)
        {
            if (!o)
                return;

            var s = this.settings;

            if (this.isCheckable()) {

                if (s.type == "radiobutton") {

                    this.check(o);     // cant turn a radiobutton off
                }
                else {
                    if (o.checked == 1)
                        this.uncheck(o);
                    else
                        this.check(o);
                }
            }
            else {

                if (o.selected)
                    this.deselect(o);
                else
                    this.select(o);
            }
        },

        toggleById: function(id)
        {
            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.toggle(o);
        },

        toggleByIndex: function (n) {

            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.toggle(s.items[n]);
        },

        //-------------------------------------------------------------

        check: function(o)
        {
            if (!o || !this.isCheckable())
                return;

            var s = this.settings;

            o.checked = 1;

            if (s.virtual_mode) {
                this._redraw();
            }
            else
            {
                var e = this.getItemElement(o);

                if (!e)
                    return;

                switch (s.type) {
                    case "checkbox":

                        e.find(".mj-checkbox-box").addClass("checked").removeClass("half-ticked");
                        break;

                    case "radiobutton":

                        this.uncheckAll();      // radio buttons are mutually exclusive
                        o.checked = 1;
                        e.find(".mj-radio").addClass("checked");
                        break;
                }
            }
        },

        checkById: function (id) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.check(o);
        },

        checkByIndex: function(n)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            var s = this.settings;

            this.check(s.items[n]);
        },

        //-------------------------------------------------------------------------------------------------------

        uncheck: function (o) {

            if (!o || !this.isCheckable())
                return;

            var s = this.settings;

            o.checked = 0;

            if (s.virtual_mode) {

                this._redraw();
            }
            else {

                var e = this.getItemElement(o);

                if (e) {
                    e.find(".mj-checkbox-box").removeClass("checked").removeClass("half-ticked");
                    e.find(".mj-radio").removeClass("checked");
                }
            }
        },

        uncheckById: function(id)
        {
            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.uncheck(o);
        },

        uncheckByIndex: function(n)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.uncheck(s.items[n]);
        },

        getChecked: function () {

            var arr = [];

            var s = this.settings;

            $.each(s.items, function (index, o) {

                if (o.checked == 1)
                {
                    o.index = index;
                    arr.push(o);
                }                        
            });
           
            return arr;
        },

        checkAll: function () {

            if (!this.isCheckable())
                return;

            var s = this.settings;

            //if (s.type != "checkbox")
            //    return;

            $.each(s.items, function (index, o) { o.checked = 1; });

            if (s.virtual_mode) {

                this._redraw();
            }
            else {

                this.$el.find(".mj-row .mj-checkbox-box").addClass("checked").removeClass("half-ticked");
                this.$el.find(".mj-row .mj-radio").addClass("checked");
            }
        },

        uncheckAll: function () {

            if (!this.isCheckable())
                return;

            var s = this.settings;

            $.each(s.items, function (index, o) { o.checked = 0; });

            if (s.virtual_mode) {
                
                this._redraw();
            }
            else {

                this.$el.find(".mj-row .mj-checkbox-box").removeClass("checked").removeClass("half-ticked");
                this.$el.find(".mj-row .mj-radio").removeClass("checked");
            }
        },

        halfTick: function (o) {

            if (!o)
                return;

            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            o.checked = 2;

            if (s.virtual_mode) {
                this._redraw();
            }
            else {

                var e = this.getItemElement(o);

                if (e)
                    e.find(".mj-checkbox-box").removeClass("checked").addClass("half-ticked");
            }
        },

        halfTickById: function (id) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.halfTick(o);
        },

        halfTickByIndex: function (n) {

            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.halfTick(s.items[n]);
        },

        halfTickAll: function () {

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            $.each(s.items, function (index, o) { o.checked = 2; });

            if (s.virtual_mode) {
                this._redraw();
            }
            else {

                this.$el.find(".mj-row .mj-checkbox-box").removeClass("checked").addClass("half-ticked");
            }
        },

        uncheckHalfTicked: function () {

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            // deselect all items which are half ticked

            $.each(s.items, function (index, o) {

                if (o.checked == 2)
                    o.checked = 0;
            });

            if (s.virtual_mode) {
                this._redraw();
            }
            else {

                this.$el.find(".mj-row .mj-checkbox-box.half-ticked").removeClass("half-ticked");
            }
        },

        //----------------------------------------------------------------------------------------------
        // enable disable functions

        disable: function (o) {

            if (!o)
                return;

            var s = this.settings;

            o.disabled = true;

            if (s.virtual_mode) {
                this._redraw();
            }
            else {

                var e = this.getItemElement(o);

                if (e)
                    e.addClass("mj-disabled");
            }
        },

        disableById: function(id)
        {
            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.disable(o);
        },

        disableByIndex: function(n)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.disable(s.items[n]);
        },

        disableAll: function()
        {
            var s = this.settings;

            $.each(s.items, function (index, o) { o.disabled = true; });

            if (s.virtual_mode) {                
                this._redraw();
            }
            else {
                this.$el.find(".mj-row").addClass("mj-disabled");
            }
        },

        enable: function (o) {

            if (!o)
                return;

            o.disabled = false;

            var s = this.settings;

            if (s.virtual_mode) {
                
                this._redraw();
            }
            else {

                var e = this.getItemElement(o);

                if (e)                    
                    e.removeClass("mj-disabled");
            }
        },

        enableById: function (n) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.enable(s.items[n]);
        },

        enableByIndex: function (n) {

            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.enable(s.items[n]);
        },

        enableAll: function () {

            var s = this.settings;

            $.each(s.items, function (index, o) { o.disabled = false; });

            if (s.virtual_mode) {

                this._redraw();
            }
            else {

                this.$el.find(".mj-row").removeClass("mj-disabled");
            }
        },

        //-------------------------------------------------------------------------
        // select functions

        selectAll: function () {

            if (this.isCheckable())
                return;

            var s = this.settings;

            $.each(s.items, function (index, o) { o.selected = true; });

            if (s.virtual_mode) {

                this._redraw();
            }
            else {

                this.$el.find(".mj-row").addClass("mj-selected");
            }
        },

        deselectAll: function () {

            if (this.isCheckable())
                return;

            var s = this.settings;

            $.each(s.items, function (index, o) { o.selected = false; });

            if (s.virtual_mode) {

                this._redraw();
            }
            else {

                this.$el.find(".mj-row").removeClass("mj-selected");
            }
        },

        getSelected: function () {

            var arr = [];

            var s = this.settings;

            $.each(s.items, function (index, o) {

                if (o.selected)
                {
                    o.index = index;
                    arr.push(o);
                }                    
            });

            return arr;
        },

        select: function (o) {

            if (this.isCheckable())
                return;

            if (!o)
                return;
 
            var s = this.settings;

            if (!s.multi_select)
                this.deselectAll();

            o.selected = true;

            var e = this.getItemElement(o);

            if (e)
                e.addClass("mj-selected");
        },

        selectById: function(id)
        {
            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.select(o);
        },

        selectByIndex: function (n) {

            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.select(s.items[n]);
        },

        deselect: function (o) {

            if (!o || this.isCheckable())
                return;

            o.selected = false;

            var e = this.getItemElement(o);

            if (e)
                e.removeClass("mj-selected");
        },

        deselectById: function (id) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.deselect(o);
        },

        deselectByIndex: function (n) {

            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.deselect(s.items[n]);
        },

        //--------------------------------------------------------------------------------
        // add, insert, update, remove functions

        add: function(data)
        {
            this._validateItem(data);

            var s = this.settings;

            s.items.push(data);
            this.visible_items.push(data);

            if (s.virtual_mode) {
                                
                this._redraw();
                this._createScrollBars();
            }
            else {

                var str = this._renderItem(data);

                this.$el.find(".mj-table").append(str);
            }
        },

        insert: function(o, data)
        {
            if (!o || !data)
                return;

            var s = this.settings;

            this._validateItem(data);

            var index = s.items.indexOf(o);

            if (index == -1)
                return false;

            s.items.splice(index, 0, data);

            var index = this.visible_items.indexOf(o);

            this.visible_items.splice(index, 0, data);

            if (s.virtual_mode) {                
                this._redraw();
                this._createScrollBars();
            }
            else {

                var e = this.getItemElement(o);

                if (!e)
                   e.append(this._renderItem(data));
            }
        },

        insertById: function (n, data) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.insert(o, data);
        },
        
        insertByIndex: function(n, data)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.insert(s.items[n], data);
        },

        update: function(o, data)
        {
            if (!o || !data)
                return;

            var s = this.settings;

            //this._validateItem(data);  // dont validateItem, we may omit properties eg change text only

            var index = s.items.indexOf(o);

            if (index > -1)
                s.items[index] = data;

            index = this.visible_items.indexOf(o);

            if (index > -1)
                this.visible_items[index] = data;

            if (s.virtual_mode) {
                this._redraw();                
            }
            else {
                var e = this.getItemElement(o);

                if (e) {

                    e.data("d", data);    

                    //o = $.extend(o, data);          // data overrides o

                    var str = this._renderItem(o);
                    e.html(str);
                }
            }
        },

        updateById: function (n, data) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.update(o, data);
        },

        updateByIndex: function(n, data)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.update(s.items[n], data);
        },

        remove: function(o)
        {
            if (!o)
                return;

            var s = this.settings;

            var index = s.items.indexOf(o);

            if (index > -1)
                s.items.splice(index, 1);

            index = this.visible_items.indexOf(o);

            if (index > -1)
                this.visible_items.splice(index, 1);

            if (s.virtual_mode) {
                this._redraw();
                this._createScrollBars();
            }
            else {

                var e = this.getItemElement(o);

                if (e)
                    e.remove();
            }
        },

        removeById: function (id) {

            if (id == null)
                return;

            var s = this.settings;

            var o = mjcore.find(s.items, function (o) { return o.id == id; });

            this.remove(o);
        },

        removeByIndex: function(n)
        {
            var s = this.settings;

            if (n == null || n < 0 || n >= s.items.length)
                return;

            this.remove(s.items[n]);
        },

        //-----------------------------------------------------------------------------------------
        // misc functions

        saveState: function () {

            // save the state of the list

            var self = this;

            this.original_data = [];

            var s = this.settings;

            $.each(s.items, function (index, o) {
                self.original_data.push({ checked: o.checked, selected: o.selected });
            });
        },

        hasChanged: function () {

            var len1 = this.settings.items.length;
            var len2 = this.original_data.length;

            if (len1 != len2)       // item has bee added
                return true;

            var s = this.settings;

            for (var i = 0; i < len1 && i < len2; i++) {

                var a = s.items[i];
                var b = this.original_data[i];

                // if new state is undefined dont count it as a change

                if (a.checked != b.checked || a.selected != b.selected)
                    return true;
            }

            return false;
        },

        sort: function (callback, direction) {

            var self = this;

            //var items = this.toArray();
            
            var s = this.settings;

            if (callback) {

                s.items.sort(function (a, b) { return callback(a, b); });
            }
            else {

                // no callback function provided, compare text fields

                s.items.sort(function (a, b) {

                    if ($.isFunction(a.text) || $.isFunction(b.text))
                        return 0;

                    var atext = String(a.text);
                    var btext = String(b.text);

                    if (!direction || direction.toLowerCase() == "asc")
                    {
                        if (atext.toLowerCase() > btext.toLowerCase())
                            return 1;

                        if (atext.toLowerCase() < btext.toLowerCase())
                            return -1;
                    }
                    else
                    {
                        if (atext.toLowerCase() < btext.toLowerCase())
                            return 1;

                        if (atext.toLowerCase() > btext.toLowerCase())
                            return -1;
                    }

                    return 0;
                });
            }

            var e = this.$el.find(".mj-table");
            e.empty();

            // rebuild visible items

            this.visible_items = [];

            $.each(s.items, function (index, o) {

                if (o.visible)
                    self.visible_items.push(o);
            });

            this._redraw();
        },

        clear: function()
        {
            var s = this.settings;

            this.$el.find(".mj-table").empty();

            s.items = [];
            this.original_data = [];
            this.visible_items = [];
            this.start = 0;
        },

        close: function () {

            // dont clear the data
            // important to turn off events

            this._stopListening();

            // we may still want to get the data after the listbox has closed so dont remove the data

            $.removeData(this.el, 'mj-listbox-data');
           
            this.$el.html("");            
        },

        scrollToItemByIndex: function (n, animate) {

            var s = this.settings;

            if (n == null)
                return;

            // can only scroll to visible items

            if (s.virtual_mode) {

                if (n < 0)
                    n = 0;

                if (n >= this.visible_items.length - s.page_size)
                    n = this.visible_items.length - s.page_size;

                if (n < 0)  // could go -ve
                    n = 0;

                this.start = n;

                this._redraw();
            }
            else {

                if (n < 0)
                    n = 0;

                if (n >= this.visible_items.length)
                    n = rows.length - 1;

                var rows = this.$el.find(".mj-row");

                var e = $(rows[n]);

                if (!e)
                    return;

                // need to use position rather than offset

                var pos = e.position().top;

                if (!animate)
                    this.$el.find(".mj-listbox").scrollTop(pos);
                else
                    this.$el.find(".mj-listbox").animate({ scrollTop: pos }, 300);
            }
        },

        scrollToItem: function (o, animate) {

            if (!o)
                return;

            var s = this.settings;

            var index = s.items.indexOf(o);

            if (index > -1)
                this.scrollToItemByIndex(index, animate);
        }
    }

    $.fn.mjListBox = function (options) {
      
        // check that element exists using this.length

        if (!this.length) {

            mjcore.mjError("mjListBox: the html element to attach to '" + this.selector + "' does not exist.");
            return null;
        }

        // within a plugin use this not $(this) to refer to the element to attach to
        // this refers to the element we are attaching to
        // needs to return this for chainability

        if (mjListBox[options]) {

            // options is the name of a method in mjListBox

            var o = $(this).data('mj-listbox-data');

            // cant call slice directly on arguments

            if (o)
                return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

            // if o is not found then the mjListBox has not been attached to the element
            // its not an necessarily and error

            return null;
        }
        else if (!options || typeof options === 'object') {

            // Note: a jquery query select can refer to any number of html elements
            // return is for chainability, dont have to return anything

            return this.each(function (index, o) {

                // remove any previous data

                //$.removeData(this, 'mj-listbox-instance');

                var x = Object.create(mjListBox);
                   
                x._init(options, o);

                // attach object instance to this html element

                $.data(o, 'mj-listbox-data', x);
            });
        }
        else {

            // method does not exist

            mjcore.mjError("mjListBox: Method '" + options + "' does not exist in mjListBox");
        }
    };
})(jQuery);     // pass jQuery as an argument to the immiediatly executed javascript function so that $ always refers to jquery

}); // document.ready
