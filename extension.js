const fs = require("fs");
const vscode = require('vscode');
const path = require("path");
const {c, cpp, node, python, java} = require('compile-run');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "code-tester" is now active!');

	let disposable = vscode.commands.registerCommand('code-tester.creategenerater', ()=>{ makegeneratorfile(); } );
	let disposable2 = vscode.commands.registerCommand('code-tester.runtests', ()=>{ runTest(); } );
	let disposable3 = vscode.commands.registerCommand('code-tester.customgentest', ()=>{ customgentest(); } );

	function makegeneratorfile() {	
		var File_Path = vscode.window.activeTextEditor.document.fileName;
		var File_Name = path.basename(File_Path);
		var Dir_path = File_Path;
		for(var i= Dir_path.length-1;i>=0;i--){if(Dir_path[i] == '\\'){Dir_path = Dir_path.substring(0,i+1);break;}}		
		var Generatorfile_path = Dir_path+'generator.cpp';

		function readData(err, data) {			
			var Data = data;
			Data = Data.split('\r').join('')
			Data = add_random_variables(Data);
			Data = addsrand_to_start(Data);
			if(Data == "error"){
				vscode.window.showErrorMessage('Plese follow the format give in Readme!');
			}
			else{
				writegeneratorfile(Data);
			}
		}

		function writegeneratorfile(Data){
			fs.writeFile(Generatorfile_path, Data, (err,data)=>{
				if(err){console.error(err);}
				else{
					vscode.window.showInformationMessage('making tests');
					compileandcreatetests(Data);
				}
			});
		}

		function compileandcreatetests(Data){
			var param = getparameters(Data);
			var testfilename = "00";
			var testcnt = parseInt(param['num']);
			if(parseInt(param.timeout) > 3000){
				param.timeout = "3000";
			}
			if(testcnt > 10){
				testcnt = 10;
			}
			var cnt = 0; 
			var vis = {}; 
			var x = setInterval(() =>{
				if(testcnt == cnt){clearInterval(x); return;}
				for(var i=0;i<1000;i++){
					testfilename = i.toString();
					if(testfilename.length < 2){testfilename = '0'+testfilename;}
					if (!fs.existsSync(Dir_path+'Tests/in'+testfilename+'.txt') && vis[testfilename] != 1 ){
						vis[testfilename] = 1;
						console.log("doesn't exist"+Dir_path+'Tests/in'+testfilename+'.txt');
						cnt++;
						compilegeneratorfile(Generatorfile_path , Dir_path + 'Tests/', testfilename, param.timeout);
						return;
					}
				}
			}, 3000 );
		}
		  
		function addsrand_to_start(Data){
			var i = Data.indexOf("main");
			while(i < Data.length && Data[i] != '{'){i++;}
			if(Data[i] == '{'){
				i++;
				Data = Data.substring(0,i)+"\n\tsrand(time(0));\n"+Data.substring(i+1,Data.length);
			}
			return Data;
		}

		function add_random_variables(Data){
			var open_brackets = ['(','{','['];
			var close_brackets = [')','}',']'];

			var lines = Data.split('\n');
			var multilinecomment = 0;
			Data = "";

			for(var l=0;l<lines.length;l++){
				var data = lines[l];
				var n = data.length;
				var tabs = "" , spaces = "";
				for(var i=0;i<n;i++){
					if(multilinecomment > 0 )continue;
					else if(data[i] == ' '){spaces += " ";}
					else if(data[i] == '\t'){tabs+="\t";}
					else if(i+2 < n && data.substring(i,i+2) == "//"){ break; }
					else if(i+2 < n && data.substring(i,i+2) == "/*"){ multilinecomment++; }
					else if(i+2 < n && data.substring(i,i+2) == '*/'){	multilinecomment--; }
					else if(i+4 < n && (data.substring(i,i+4) == "cin>" || data.substring(i,i+4) == "cin ") && multilinecomment == 0){
						var variable = [];
						var Interval = [];
						var temp_string = "";
						var brackets = 0;
						for(var j=i+3;j<n;j++){
							if(data[j] == ';'){
								data = data.substring(0,i)+'//'+data.substring(i,n);
								if(temp_string != ""){
								variable.push(temp_string);}
								i = j + 1 + 2;// '//'(extra)
								n = data.length;
								break;
							}
							else if(j+2<n && data.substring(j,j+2) == '>>' && brackets == 0){
								if(temp_string != ""){
								variable.push(temp_string);}
								temp_string = "";j++;
							}
							else{
								for(var k=0;k<open_brackets.length;k++){if(data[j] == open_brackets[k]){brackets++;}}
								for(var k=0;k<close_brackets.length;k++){if(data[j] == close_brackets[k]){brackets--;}}
								if(data[j] != ' ')
									temp_string += data[j];
							}
						}
						if(i + 2 >= n || data.substring(i,i+2) != "//" ){
							vscode.window.showErrorMessage("Interval are not specified via comments on linenum:"+(l+1));
							return "error";
						}else{i+=2;}// '//'(extra)

						temp_string = data.substring(i,n);
						var temp_array = temp_string.split(' ');

						for(var j=0;j<temp_array.length;j++){
							if(temp_array[j].length <= 1)continue;
							Interval.push( temp_array[j].split('-') );
							if(Interval[j].length != 2){
								vscode.window.showErrorMessage("Interval of variable are not properly specified on linenum:"+(l+1));
								return "error";
							}
						}
						if(Interval.length != variable.length){
							vscode.window.showErrorMessage("Interval count doesn't match input variable count on linenum:"+(l+1));
							return "error";
						}
						var final_string = "";
						for(var j=0;j<variable.length;j++){
							final_string += tabs + spaces + variable[j] + ' = rand()%('+Interval[j][1]+'-'+Interval[j][0]+'+1)+'+Interval[j][0]+'; ';
							final_string += " cout<<"+variable[j]+"<<\" \";\n";
						}
						final_string += tabs + spaces + "cout<<\" --input \"<<endl;\n";
						data = data + '\n' + final_string;
						break;
					}
				}
				Data += data  + '\n';
			}
			return Data;
		}

		fs.readFile(File_Path, 'utf8', readData);
	}

	function runTest(){
		var File_Path = vscode.window.activeTextEditor.document.fileName;
		var File_Name = path.basename(File_Path);
		var Dir_path = File_Path;
		for(var i= Dir_path.length-1;i>=0;i--){if(Dir_path[i] == '\\'){Dir_path = Dir_path.substring(0,i+1);break;}}		
		var test_path = Dir_path+'/Tests/';
		var files_arr = [];
		var mappedfiles = [];
		var nooffiles = 0;
		var timeout;
		var testid;
		
		fs.readFile(File_Path, 'utf8', readcode);
		
		function readcode(err, data) {
			data = data.split('\r').join('')
			var X = getparameters(data);
			timeout = X.timeout;
			testid = X.test;
			readDirectory();
		}

		function readDirectory(){
			fs.readdir(test_path, function (err, files) {
				if (err) {
					vscode.window.showErrorMessage("no tests avaiable");
					return;
				} 
				files.forEach(function (file) {
					files_arr.push(file);
					mappedfiles[file] = 1;
					nooffiles++;
				});
				testfiles();
			});
		}
			
		function testfiles(){
			var f = 0;
			if(typeof(testid) !="undefined" && testid != "all"){
				if(mappedfiles[testid] != 1 || mappedfiles["out"+testid.substring(2,testid.length)] != 1 ){
					vscode.window.showErrorMessage("Specified Test doen't exist");
					return;
				}
				else{
					var file_id = testid.substring(2,testid.length);
					function readinput(err, data) {
						data = data.split('\r').join('')
						compilefileon(File_Path , data, file_id);
					}
					fs.readFile(test_path+testid, 'utf8', readinput);
				}
			}
			else{
				var X = setInterval(()=>{
					var file = testid;
					if(f == nooffiles/2){clearInterval(X);return;}
					file = files_arr[f];
					f++;
					while(f < nooffiles/2 && (
						(file.length < 6 || file.substr(0,2) != "in") ||
						( mappedfiles["out"+file.substring(2,file.length)] != 1 ))
					){f++;continue;}		

					var file_id = file.substring(2,file.length);

					function readinput(err, data) {
						data = data.split('\r').join('')
						compilefileon(File_Path , data, file_id);
					}

					fs.readFile(test_path+file, 'utf8', readinput);

				}, parseInt(timeout));
			}
		}
		
		function writeoutputfile(file_id, data){
			var result_path = Dir_path + '/Results/';
			if (!fs.existsSync(result_path)){
				fs.mkdirSync(result_path);
			}
			var outputfile_path = result_path+'ans'+file_id;
			writefile(data);
			function writefile(data){
				fs.writeFile(outputfile_path, data , (err,Data)=>{
					if(err){console.error(err);}
					else{
						match_solutions(file_id , data);
					}
				});
			}
		}
		function match_solutions(file_id, answer){
			function readreal(err, data) {
				data = data.split('\r').join('')
				answer = answer.split('\r').join('')

				var output = data;
				var out = [];
				var ans = [];
				var temp = output.split('\n');
				for(var t = 0;t<temp.length;t++){
					var string  = temp[t];
					var S = string.split(' ');
					for(var j=0;j<S.length;j++){
						if(S[j] != ''){
							out.push(S[j]);
						}
					}
				}
				temp = answer.split('\n');
				for(var t = 0;t<temp.length;t++){
					var string  = temp[t];
					var S = string.split(' ');
					for(var j=0;j<S.length;j++){
						if(S[j] != ''){
							ans.push(S[j]);
						}
					}
				}
				out.sort();
				ans.sort();

				if(out.length != ans.length){
					vscode.window.showErrorMessage("WA:"+file_id);
					return;	
				}
				else{
					for(var i=0;i<out.length;i++){
						if(out[i] != ans[i]){
							vscode.window.showErrorMessage("WA:"+file_id);
							return;
						}
					}
				}
				vscode.window.showInformationMessage("OK TESTED: "+file_id);

			}
			fs.readFile( test_path + "out"+ file_id , 'utf8', readreal);
		}

		function compilefileon(path, input, file_id){
			var Result = "";
			let resultPromise = cpp.runFile(path, {timeout: timeout , stdin : input});
			resultPromise
				.then(result => {
					if(result.stderr.length > 0 || result.exitCode > 0 || typeof(result.errorType) != 'undefined'){
						console.log("Error Description:");
						console.log("std error: " + result.stderr);
						console.log("exit Code: " + result.exitCode);
						console.log("error Type: " + result.errorType);
						if(result.errorType == "run-time"){
							vscode.window.showErrorMessage("TLE: "+file_id);
						}
						vscode.window.showErrorMessage("Error: while creating test"+file_id);
					}
					vscode.window.showInformationMessage("writing solutions: "+file_id);
					writeoutputfile(file_id , result.stdout);
				}).catch(err => {
					console.log(err);
				}
			);
		}
	}
	
	function getparameters(Data){
		var lines = Data.split('\n');
		var values = {"timeout":"2000" , "num":"0", "test": "all"};
		if(lines.length == 0){return values;}
		var data = "";
		for(var i=lines.length-1;i>=0;i--){
			if(lines[i].length > 5){
				data = lines[i];
				break;
			}
		}
		if(data.length < 7)return values;
		if(data.substr(0,2) != '//'){return values;}
		var temp = data.substring( 2, data.length);
		var vars = temp.split(' ');
		for(var i=0;i<vars.length;i++){
			var param = vars[i].split('-');
			values[param[0]] = param[1];
		}
		return values;
	}

	function customgentest(){
		var File_Path = vscode.window.activeTextEditor.document.fileName;
		var Dir_path = File_Path;
		for(var i= Dir_path.length-1;i>=0;i--){if(Dir_path[i] == '\\'){Dir_path = Dir_path.substring(0,i+1);break;}}		
		var test_path = Dir_path+'/Tests/';

		fs.readFile(File_Path, 'utf8', readcode);
		
		function readcode(err, data) {
			data = data.split('\r').join('')
			var X = getparameters(data);
			var param = getparameters(data);
			var testfilename = "00";
			var testcnt = parseInt(param['num']);
			if(parseInt(param.timeout) > 3000){
				param.timeout = "3000";
			}
			if(testcnt > 10){
				testcnt = 10;
			}
			var cnt = 0; 
			var vis = {}; 
			vscode.window.showInformationMessage('making tests');
			var x = setInterval(() =>{
				if(testcnt == cnt){clearInterval(x); return;}
				for(var i=0;i<1000;i++){
					testfilename = i.toString();
					if(testfilename.length < 2){testfilename = '0'+testfilename;}
					if (!fs.existsSync(Dir_path+'Tests/in'+testfilename+'.txt') && vis[testfilename] != 1 ){
						vis[testfilename] = 1;
						console.log("doesn't exist"+Dir_path+'Tests/in'+testfilename+'.txt');
						cnt++;
						compilegeneratorfile(File_Path , Dir_path + 'Tests/', testfilename, param.timeout);
						return;
					}
				}
			}, 3000 );
		}
	}
	function compilegeneratorfile(Generatorfile_path , Dir_path, filename, timeout){
		var Result = "";
		let resultPromise = cpp.runFile(Generatorfile_path, {timeout: timeout});
		resultPromise
			.then(result => {
				if(result.stderr.length > 0 || result.exitCode > 0 || typeof(result.errorType) != 'undefined'){
					console.log("Error Description:");
					console.log("std error: " + result.stderr);
					console.log("exit Code: " + result.exitCode);
					console.log("error Type: " + result.errorType);
					if(result.errorType == "run-time"){
						vscode.window.showErrorMessage("TLE: "+filename);
					}
					vscode.window.showErrorMessage("Error: while creating test"+filename);
				}
				if(result.stdout.length > 0){
					Result = result.stdout;
					SeprateResult(Result, Dir_path,filename);
				}
				console.log(result);
			})
			.catch(err => {
				console.log(err);
			}
		);
	}
	function SeprateResult(Data, Dir_path, filename) {
		if (!fs.existsSync(Dir_path)){
			fs.mkdirSync(Dir_path);
		}
		var inputfile_path = Dir_path+'in'+filename+'.txt';
		var outputfile_path = Dir_path+'out'+filename+'.txt';
		
		Data = Data.split('\r').join('')
		seperate(Data);		
		
		function writegeneratorfile(X){
			var flag = 1;
			fs.writeFile(inputfile_path, X[0], (err,data)=>{
				if(err){console.error(err);flag = 0;}
			});
			fs.writeFile(outputfile_path, X[1], (err,data)=>{
				if(err){console.error(err);flag = 0;}
			});
			if(flag) vscode.window.showInformationMessage('test: '+filename+' done!');
		}
		  
		function seperate(Data){
			var lines = Data.split('\n');
			var n = lines.length;
			var input = "";
			var output = "";
			for(var i=0;i<n;i++){
				var x = lines[i].indexOf("--input");
				if(x == -1){
					output += lines[i] + "\r\n";
				}
				else{
					input += lines[i].substring(0,x) + "\r\n";
				}
			} 	
			writegeneratorfile([input , output]);
		}
		

	}

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
