$(document).ready(function() {

// reference:
// http://learn.jquery.com/plugins/basic-plugin-creation/
    
(function ($) {

    var mjDropDown = {

        _init: function (options, el) {

            this.widget_class = "mjDropDown";

            // data item structure:

            // id: string
            // text:            
            // selected: true,false    (only used if type is not checkbox or radiobutton)
            // checked: 0,1,2
            // disabled: true,false
            // image: null

            this.el = el;
            this.$el = $(el);

            // plugin have been applied previously, blow away any existing instance

            this.close();

            this._validateData(options);

            this._render();

            this._startListening();

            return this;
        },

        _validateData: function(options)
        {
            var default_options = {

                // mjListBox propertes

                items: [],                  // array of item obects
                type: "text",               // text, checkbox, radiobutton. 
                multi_select: false,        // if true can select multiple items when type set to text
                component_order: ["button", "image", "text"],
                text_width: null,           // for elispses or positioning buttons and images on the right specify a text width
                itemRender: null,           // custom render function
                dragdrop: false,
                enable_hover: true,
                horizontal: false,
                wrap_text: false,

                // dropdown propertes

                dropdown_text: "select: ",

                // properties common to all controls

                width: 'auto',
                height: 'auto',
                disabled: false,
                theme: null
            };

            this.settings = $.extend({}, default_options, options);  // options overrides default
        },

        _render: function () {

            var self = this;

            var s = this.settings;

            var widget = $("<div>", { class: 'mj-widget mj-dropdown ' });

            var dropdown_text = s.dropdown_text;

            if (s.type == "text") {

                var selected = jQuery.grep(s.items, function (a) { return a.selected == true; });

                if (selected.length > 0)
                    dropdown_text = selected[0].text;                
            }
            else
            {
                var checked = jQuery.grep(s.items, function (a) { return a.checked == 1; });

                if (checked.length > 0)
                    dropdown_text = jQuery.map(checked, function (o) { return o.text; }).join(",");
            }

            var handle_el = $("<div>", { class: 'mj-dropdown-handle' });
            handle_el.append($("<div>", {class: 'mj-dropdown-handle-text mj-nowrap', html: dropdown_text}));

            this.list_el = $("<div>", { class: 'mj-dropdown-list-container' });

            widget.append(handle_el);

            widget.append(this.list_el);

            this.$el.html(widget);

            this.list_el.mjListBox(s).hide();

            if (s.width != null && s.width != "auto")
                this.$el.find(".mj-widget").css("max-width", s.width);

            if (s.height != null && s.height != "auto")
                this.$el.find(".mj-widget").css("height", s.height);

            return this;
        },       

        _startListening: function () {

            var self = this;
            var s = this.settings;

            this._stopListening();

            this.$el.on("click", ".mj-dropdown-handle", function (e) {

                e.preventDefault();

                if (!self.list_el.is(":visible"))
                {
                    $(e.currentTarget).css({ "border-bottom-left-radius": "0px", "border-bottom-right-radius": "0px" });
                    self.list_el.show();
                }
                else
                {
                    $(e.currentTarget).css({ "border-bottom-left-radius": "5px", "border-bottom-right-radius": "5px" });
                    self.list_el.hide();
                }
            });

            this.list_el.on("selected", function(e, data) {
                
                self.$el.find('.mj-dropdown-handle-text').html(data.text);
            });

            this.list_el.on("checkChange", function (e, data) {

                var checked = self.list_el.mjListBox("getChecked");

                var str = "";

                $.each(checked, function (i, o) {

                    if (str !== "")
                        str += ",";

                    str += o.text;
                });

                if (str == "")
                    self.$el.find('.mj-dropdown-handle-text').html(s.dropdown_text);
                else
                    self.$el.find('.mj-dropdown-handle-text').html(str);
            });

            $(document).on('mouseup', this, function (e) {

                var container = self.$el;

                if (!container.is(e.target)                  // we clicked on something other than the container
                    && container.is(":visible")
                    && container.has(e.target).length === 0) // ... nor a descendant of the container
                {
                    self.$el.find(".mj-dropdown-handle").css({ "border-bottom-left-radius": "5px", "border-bottom-right-radius": "5px" });
                    self.list_el.hide();
                }

            });
        },       

        _stopListening: function()
        {
            this.$el.off();
        },

        _resetHandleText: function()
        {
            var s = this.settings;

            var checked = this.list_el.mjListBox("getChecked");

            var str = "";

            $.each(checked, function (i, o) {

                if (str !== "")
                    str += ",";

                str += o.text;
            });

            if (str == "")
                this.$el.find('.mj-dropdown-handle-text').html(s.dropdown_text);
            else
                this.$el.find('.mj-dropdown-handle-text').html(str);
        },
        

        close: function () {

            if (this.list_el)
                this.list_el.mjListBox("close");

            // dont clear the data
            // important to turn off events

            this._stopListening();

            // we may still want to get the data after the listbox has closed so dont remove the data

            $.removeData(this.el, 'mj-dropdown-data');
           
            this.$el.html("");            
        }       
    }

    $.fn.mjDropDown = function (options) {

        // check that element exists using this.length

        if (!this.length) {

            mjcore.mjError("mjDropDown: the html element to attach to '" + this.selector + "' does not exist.");
            return null;
        }

        // within a plugin use this not $(this) to refer to the element to attach to
        // this refers to the element we are attaching to
        // needs to return this for chainability

        var listbox_functions = [
                   "getElementAt",
                   "isCheckable",
                   "getItem",
                   "getItems",
                   "toArray",
                   "getItemAt",
                   "search",
                   "toggle",
                   "check",
                   "checkAt",
                   "uncheck",
                   "unchecktAt",
                   "getChecked",
                   "isChecked",
                   "checkAll",
                   "uncheckAll",
                   "halfTick",
                   "halfTickAll",
                   "uncheckHalfTicked",
                   "disable",
                   "disableAt",
                   "disableAll",
                   "enable",
                   "enableAt",
                   "enableAll",
                   "selectAll",
                   "deselectAll",
                   "getSelected",
                   "isSelected",
                   "select",
                   "selectAt",
                   "deselect",
                   "deselectAt",
                   "add",
                   "insert",
                   "insertAt",
                   "update",
                   "updateAt",
                   "remove",
                   "removeAt",
                   "saveState",
                   "hasChanged",
                   "sort"];

        if (mjDropDown[options]) {

            // options is the name of a method in mjDropDown

            var o = $(this).data('mj-dropdown-data');

            // cant call slice directly on arguments
           
            if (o)
                return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

            // if o is not found then the mjDropDown has not been attached to the element
            // its not an necessarily and error

            return null;
        }
        else if ($.inArray(options, listbox_functions) > -1)
        {
            var q = $(this).data('mj-dropdown-data');
            var o = q.list_el.data('mj-listbox-data');

            if (o) {

                var res = o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                q["_resetHandleText"].apply(q, Array.prototype.slice.call(arguments, 1));

                return res;
            }

            return null;
        }
        else if (!options || typeof options === 'object') {

            // Note: a jquery query select can refer to any number of html elements
            // return is for chainability, dont have to return anything

            return this.each(function (index, o) {

                // remove any previous data

                //$.removeData(this, 'mj-listbox-instance');

                var x = Object.create(mjDropDown);
                   
                x._init(options, o);

                // attach object instance to this html element

                $.data(o, 'mj-dropdown-data', x);
            });
        }
        else {

            // method does not exist

            mjcore.mjError("mjDropDown: Method '" + options + "' does not exist in mjDropDown");
        }
    };
})(jQuery);     // pass jQuery as an argument to the immiediatly executed javascript function so that $ always refers to jquery

}); // document.ready
