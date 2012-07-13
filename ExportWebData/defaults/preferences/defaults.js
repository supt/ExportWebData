pref('extensions.exportwebdata.mailsendexe', '');
pref('extensions.exportwebdata.ftpexe', '');
pref('extensions.exportwebdata.notification', 0);
pref('extensions.exportwebdata.smtpserver', '');
pref('extensions.exportwebdata.smtpuser', '');
pref('extensions.exportwebdata.smtpname', '');
pref('extensions.exportwebdata.smtpport', '');
pref('extensions.exportwebdata.smtpsecurity', 'starttls');
pref('extensions.exportwebdata.filtertags', 'script,link,form');
pref('extensions.exportwebdata.emailsubject', '%url%'); // String that can contain %url%, %title%
pref('extensions.exportwebdata.ftpmaxretries', 2);
pref('extensions.exportwebdata.ftptimeout', 15);
// %DOMAIN_MAIN% Main domain name of content url e.g. for www.yahoo.com, its value is yahoo
// %YYYY% Four digit year
// %YY% Two digit year
// %MM% Two digit month
// %DD% Two digit date
// %HH% Two digit hour (24-hour clock)
// %hh% Two digit hour (12-hour clock)
// %mm% Two digit minutes
// %ss% Two digit seconds
// %ms% Milliseconds
pref('extensions.exportwebdata.ftpfilenamepattern', '%DOMAIN_MAIN%_%YYYY%_%MM%_%DD%_%HH%_%mm%_%ss%_%ms%.html');
pref('extensions.exportwebdata.firstrundone', false);
pref('extensions.exportwebdata.progressbarduration', 5000);

