# mjGrid

A jquery plugin for rendering json data as in a grid.

Examples:

http.www.multilistjs.com

## Documentation

### Options:

 Assumptions
- in virtual_mode all rows are the same height
- in virtual_mode page_size rows fills the grid

if you use virtual mode and this is not the case use a different control

### Parameters

rows: []                   // eg [<json-object>,...] 
virtual_mode: true
page_size: 10                       // number of rows visible (need this in virtual mode)
show_column_headers: true   
borders: [none,right,bottom,grid,all]       eg for bottom and right enter bottom,right
border_color: "efefef"
dragdrop: rows|cells                     // enable drag drop
select_mode: [none,row,cell,multiple_row,multiple_cell]

columns: [{
			text: "",
			data_field: null,                   // mandatory
			data_type: "string",                // int, float, double, number, date      used for validation and sorting, (default: string)
			width: "auto",
			type: "text",                       // text, checkbox, radiobutton, image, dropdown
			class_name: null,
			col_header_class_name: null,
			editable: false,                    
			align: "left",                      // left, right, center
			wrap_text: false,                    
			fixed_columns: 0,                   // number of fixed columns on the left, only works in virtual mode
			sortable: false,

			// TBD

			disabled: false,                    // TBD for disabled columns
			group: null,                        // TBD for nested column headers
			hidden: false,                      // TBD for hidden columns                   

			// column functions

			columnHeaderCellRender: null,       // function to draw column header cell
			cellRender: null,                   // function to draw a row cell
			cellValidate: null,                 // function to validate a cell
			editTransform: null                 // function to transform edit cell value before validate
			cellFormat: null                    // function to format a cell when rendering
			
### Events

cellClick
headerCellClick
cellValueChange
cellValidationError
dragend
cellDragEnd
checkChange

### Functions

addRow
insertRow
removeRow
updateRow
updateCell
addColumn
removeColumn
getRows
sorting
select/deselect
scrollToRow

#Example

var musicians = ["Prince", "Michael Jackson", "Brand X", "Emerson Lake and Palmer", "Steely Dan", "Weather Report", "Stranglers", "Santana", "Kate Bush", "Kelly Clarkson", "Yes", "Al Dimeloa", "Django Rheinhardt", "Pat Metheny", "David Bowie", "Paco De Lucia", "Chaka Khan", "Elton John", "Mike Oldfield", "Status Quo", "Supertramp", "Mister Mister", "The Eagles", "Beatles", "Simple Minds", "Gary Numan", "Duran Duran"];
var companies = ["Apple", "JP Morgan", "Google", "Amazon", "HP", "Deutsche Bank", "Adobe", "Woolworths", "Exxon", "Goldman Sachs"];
var cities = ["Sydney", "Cairo", "Istanbul", "New York", "Tokyo", "Sao Paulo", "Cancun", "Rome", "Bergen", "Oslo", "Stockholm", "Copenhagen"];
var planets = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
var flowers = ["rose", "petunia", "Chrysanthemum", "tulip", "hydranga", "jonquil", "darnation", "daffodil", "sunflower", "gerbera"];
var languages = ["english", "french", "italian", "german", "japanese", "portuguese", "spanish", "greek"];
var countries = ["iceland", "thailand", "nepal", "angola", "botswana", "eygpt", "south africa", "israel"];

var data = [];

var len = [musicians.length, companies.length, cities.length, planets.length, flowers.length, languages.length, countries.length];

for (var i = 0; i < n-1; i++) {

	var j = 0;

	data.push({
		id: i+1,
		musician: musicians[Math.floor(Math.random() * len[j++])],
		company: companies[Math.floor(Math.random() * len[j++])],
		city: cities[Math.floor(Math.random() * len[j++])],
		planet: planets[Math.floor(Math.random() * len[j++])],
		flower: flowers[Math.floor(Math.random() * len[j++])],
		language: languages[Math.floor(Math.random() * len[j++])],
		country: countries[Math.floor(Math.random() * len[j++])]
	}
	);
}

var j = 0;

data.push({
	id: n,
	musician: "Jeff Beck",
	company: companies[Math.floor(Math.random() * len[j++])],
	city: cities[Math.floor(Math.random() * len[j++])],
	planet: planets[Math.floor(Math.random() * len[j++])],
	flower: flowers[Math.floor(Math.random() * len[j++])],
	language: languages[Math.floor(Math.random() * len[j++])],
	country: countries[Math.floor(Math.random() * len[j++])]
});

var columns = [{ text: "id", data_field: "id", width: 50},
				{ text: "Musician", data_field: "musician", width: 100 },
				{ text: "Company", data_field: "company", width: 100 },
				{ text: "city", data_field: "city", width: 100 },
				{ text: "planet", data_field: "planet", width: 100 },
				{ text: "Flower", data_field: "flower", width: 100 },
				{ text: "Language", data_field: "language", width: 100 },
				{ text: "Country", data_field: "country", width: 100 }];

var rows = getData(1000);

var options = {
	columns: columns,
	rows: rows,
	page_size: 9,
};

$(".widget").mjGrid(options);

gridEventHandler();

$(".widget").on("cellClick", function (e, options) {
	console.log("cellClick");
});