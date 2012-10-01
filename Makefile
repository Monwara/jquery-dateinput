build:
	uglifyjs dateinput.js > dateinput-`grep @version dateinput.js | sed 's/ \* @version //'`.min.js

doc:
	cat dateinput.js | grep "^\ \+\*\ *" | sed 's| \+\* \?||' | sed 's|^/||' | grep -v '^@' > README.mkd
