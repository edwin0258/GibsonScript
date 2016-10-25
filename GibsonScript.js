
//Node.js, get file through command line.
var fs = require("fs");
fs.readFile(process.argv[2], "utf8", (err,data) => {
    if(err){
        console.log(err);
    }
    console.log(data);
    gibson(data);
});


var tokens = [];
var symbols = {};
/* SYNTAX - object */
/*
	key: 	Is the desired function of the value, such as
				print. At the momment "DECK" will execute the
				desired function of print or console.log in a
				language.
*/
var syntax = {"PRINT": "DECK","RETURN":"EXTRACT","FUNCTION":"SYNTH","FUNCTIONCALL":"AUGMENT",
"FUNCTIONEND":"TOKYO","VAR":"CONSTRUCT","IF":"NODE IF","ELSE":"ELSE","ENDIF":"ENDNODE","END":"<JACKOUT>"};

/* LEX - https://en.wikipedia.org/wiki/Lexical_analysis */
/*
	tok: 	How the lex converts characters into meaningful tokens
				such as strings and functions
	state:	detects a string, if it finds a " it will turn on and
					collect the string utill it finds the next " where it
					will then send the string off as a token appending it
					to the tokens array.
	isexpr: if a expression character is detected outside of a 
					string then it will attempt isexpr will be turned on
					and all numbers on the line of the expression will
					be evaluated. If it is not turned on then the numbers
					are just numbers and will be sent to the parser as 
					a number instead of an expression to be calculated.
	isvar:	If the var keyword is detected the program will
					switch this to 1 and will then begin collecting the
					variable name. The variables value is collected 
					normally through numbers, strings, and expressions.
	string: This is where the string is collected when the state
					is turned on.
	expr:		Collects full expression while the isexpr is turned to
					1. Outputs a number if no isexpr is turned to 0.
	variable:		There to collect full variable name, once a equals,
							comma, or a newline is detected the variable name
							is saved and the variables value is collected
							normally.
*/

function upperMatch(x,y){
	return x.toUpperCase().match(y)
}

function lex(script){
	var tok = ""; 
	var state = 0;
	var isexpr = 0;
	var isvar = 0;
	var isfunc = 0;
	var string = "";
	var expr = "";
	var variable = "";
	var function_name = "";
	script = script.split('');
	for(var x in script){
		var char = script[x];
		tok+=char;
		if(tok === " " || tok === "\t"){
			tok = "";
		}
		else if(tok === "\n" || upperMatch(tok,syntax["END"])){
			if(expr != "" && isexpr == 1){
				tokens.push("EXPR: " + expr);
				isexpr = 0;
				expr = "";
			}
			else if(expr != "" && isexpr == 0){
				tokens.push("NUM: " + expr);
				expr = "";
			}
			else if(variable != "" && isvar == 1){
				tokens.push("VAR: " + variable);
				isvar = 0;
				variable = "";
			}
			else if(function_name != "" && isfunc == 1){
				tokens.push("FNAME: " + function_name);
				isfunc = 0;
				function_name = "";
			}
			tok = "";
		}
		//console.log(tok)
		if(upperMatch(tok,syntax["PRINT"]) && state === 0){
			tokens.push(syntax["PRINT"]);
			tok = "";
		}
		else if(upperMatch(tok,syntax["RETURN"]) && state === 0){
			tokens.push(syntax["RETURN"]);
			tok = "";
		}
		else if(upperMatch(tok,syntax["IF"])){
			tokens.push(syntax["IF"]);
			tok = "";
		}
		else if(upperMatch(tok,syntax["ELSE"])){
			tokens.push(syntax["ELSE"]);
			tok = "";
		}
		else if(upperMatch(tok,syntax["ENDIF"])){
			tokens.push(syntax["ENDIF"]);
			tok = "";
		}
		
		else if(tok.match(/\d/g)){
			expr += tok;
			tok = "";
		}
		else if(tok.match(/\+|-|\/|\*|\)|\(/g)){
			isexpr = 1;
			expr += tok;
			tok = "";
		}
		//if STRING//
		else if(tok === "\""){
			if(state === 0){
				state = 1;
			}
			else{
				state = 0;
				tokens.push("STRING: " + string);
				string = "";
				tok = "";
			}
		}
		else if(state == 1){
			string+=char;
			tok = "";
		}
		//if NUMBER//
		else if(tok == parseInt(tok)){
			tokens.push(parseInt(tok));
			tok = "";
		}
		//IF ASSIGNMENT//
		else if(tok === "=" && state === 0){
			if(variable != ""){
				tokens.push("VAR: " + variable);
				variable = "";
				isvar = 0;
			}
			if(tokens[tokens.length - 1] == "EQUALS"){
				tokens[tokens.length - 1] = "EQEQ";
			}
			else{
				tokens.push("EQUALS");
			}
			tok = "";
		}
		//IF VAR//
		else if(tok.match(syntax["VAR"]) && state === 0 || tok === "_" && state === 0 && isexpr === 0){
			isvar = 1;
			tok = "";
		}
		else if(isvar == 1){
			variable += tok;
			tok = "";
		}
		//IF FUNCTION//
		else if(upperMatch(tok,syntax["FUNCTION"])){
			tokens.push(syntax["FUNCTION"]);
			tok = "";
			isfunc = 1;
		}
		else if(upperMatch(tok,syntax["FUNCTIONEND"])){
			tokens.push(syntax["FUNCTIONEND"]);
			tok = "";
			isfunc = 0;
		}
		else if(upperMatch(tok,syntax["FUNCTIONCALL"])){
			tokens.push(syntax["FUNCTIONCALL"]);
			tok = "";
			isfunc = 1;
		}
		else if(isfunc === 1){
			function_name += tok;
			tok = "";
		}
		
	}
	//add an end statement to program to prevent loops and such.
	tokens.push(syntax["END"]);
	return tokens;
}

/* PARSER - function */
/*
	Takes the tokens generated by the lex and actually
	figures out what to do with them (parsing them).
	For each tok it will examine and determine if
	anything needs to be done.
	
	PRINT
		argument: This is what should be printed
							so PRINT 'argument'
	VAR
		variables will either go into a function 
		like print where they will be decoded if
		they exist. 
*/
var compiledFile = "";

//Get the amount of slice for the type (string, num, expr)
function getTypeSlice(x){
    if(x.match("STRING")){
		return "\"" + x.slice(8,x.length) + "\"";
	}
	else if(x.match("NUM")){
		return parseInt(x.slice(5,x.length));
	}
	else if(x.match("EXPR")){
		return x.slice(6,x.length);
	}
    
}

function parser(toks){
	console.log(toks);
	var i = 0;
	var conditional = false;
	while(i < toks.length - 1){
		var a = toks[i];
		var b = i;
		if(a == syntax["PRINT"]){
			//if(toks[b+1]){console.error("NO")}
			var argument = toks[b+1];
			if(argument.match("VAR")){
				logErrors({"type":"VAR","argument":argument});
				compiledFile += "console.log(" + argument.slice(5,argument.length) + ");\n";
				argument = symbols[argument.slice(5,argument.length)];
				
			}
			if(argument.match("EXPR")){
				argument = evaluateExpr(getTypeSlice(argument));
			}
			else{
				argument = getTypeSlice(argument);
			}
			console.log(argument);
			compiledFile += "console.log(" + argument + ");\n";
		}
		if(a.slice(0,3) === "VAR"){
			if(toks[b+1] === "EQUALS"){
				if(toks[b+2].slice(0,3) === "VAR"){
					toks[b+2] = symbols[toks[b+2].slice(5,toks[b+2].length)];
				}
				//if there is still a variable name(in expression)
				toks[b+2] = convertVariables(toks[b+2]);
				compiledFile += "var " + a.slice(5,a.length) + " = " + getTypeSlice(toks[b+2]) + ";\n";
				symbols[a.slice(5,a.length)] = toks[b+2];
			}
			//console.log(symbols)
		}
		if(a == syntax["FUNCTION"]){
			var function_contents = ""
			console.log("FOUND A FUNCTION: " + toks[b+1])
			//skip over contents of function but store for later reference.
			while(a != (syntax["FUNCTIONEND"] || syntax["END"])){
				function_contents += "," + a;
				i++;
				a = toks[i];
			}
			//split function contents so they look like normal tokens and store them
			//in symbols.
			function_contents = function_contents.split(',')
			symbols[function_contents[2].slice(7)] = function_contents.slice(3);
			console.log("FOUND END: " + a)
			console.log(symbols)
		}
		if(a == syntax["FUNCTIONCALL"]){
			var function_n = symbols[toks[b+1].slice(7)];
			//if function call is valid insert the functions contents
			//into tokens to be run.
			if(function_n){
				function_n.map((a) => {
					console.log(a);
					//push each function element before the END keyword.
					toks.splice(toks.length - 1, 0 ,a);
				})
				console.log(toks)
			}
		}
		if(a == syntax["IF"]){
			if(evaluateExpr(toks[b+1]) === true){
				conditional = true;
			}
			else{
				while(a != syntax["ELSE"] && a != syntax["ENDIF"] && a != syntax["END"]){
					i++;
					a = toks[i];
				}
			}
		}
		if(conditional == true && a == syntax["ELSE"]){
			while(a != syntax["ENDIF"] && a != syntax["END"]){
				i++;
				a = toks[i];
			}
			if(a == syntax["END"]){
				console.error("MISSING: " + syntax["ENDIT"]);
			}
			
			conditional = false;
		}
		i++;
	}
	//for returning values from GibsonScript back into JavaScript
	return toks.map((a,b) => {
		if(a == syntax["RETURN"]){
			var argument = toks[b+1];
			if(argument.match("VAR")){
				logErrors({"type":"VAR","argument":argument});
				argument = symbols[argument.slice(5,argument.length)];
			}
			return getTypeSlice(argument)
		}
	})
}

/*
each error_object will give logErrors the
information to make an error given the
circumstances.
*/
function logErrors(error_obj){
	if(error_obj["type"] == "VAR"){
		var argument = error_obj["argument"];
		if(!symbols[argument.slice(5,argument.length)]){console.error("variable not found: " + argument.slice(5,argument.length))}
	}
}

function convertVariables(data){
	return data =
	data.replace(/\_\w*/g, (match) => {
		var var_value = symbols[match.slice(1,match.length)];
		return getTypeSlice(var_value);
	});
}

function evaluateExpr(expression){
	//if variable in expresssion.
	expression = convertVariables(expression);
	//console.log(expression)
	for(var x in expression){
		//prevent malicious intent
		if(x.match(/\+|-|\/|\*|\)|\(|\d/g) == null){
			console.error("Invalid Expression");
			return 0;
		}
	}
	return eval(expression);
}


/*
GibsonScript V.000010
To use GS:
	1. 	Add this pen in javascript Add External JS section
			for your pen.
	2.	Wrap your code like:
			gibson(
			`
			CODE HERE
			`
			)
*/
function gibson(script){
	var toks = lex(script);
	var results = parser(toks);
	//Node.js, write a JavaScript file of the compiledFile in addition to executing program.
	fs.writeFile(process.argv[2].replace(/\.(.*)/g,".js"), compiledFile, (err) =>{
	    if(err){
	        console.log(err);
	    }
	});
	//For retrieving any values from GibsonScript back into JS.
	return results.reduce((a,b) => {
			if(b != undefined){
				a.push(b);
			}
			return a;
	},[]);
}
