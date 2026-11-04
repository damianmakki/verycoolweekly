import { exportPreferences } from './preferences.mjs';
const args=process.argv.slice(2),index=args.indexOf('--before'),before=index>=0?args[index+1]:undefined;
if(index>=0&&!/^\d{4}-\d{2}-\d{2}$/.test(before||''))throw new Error('Use --before YYYY-MM-DD');
const profile=await exportPreferences(process.cwd(),before?{before}:{});
console.log(`Preference brief: exports/preferences/${before||'latest'}.json\n${profile.reviewed} reviewed articles · ${profile.kept} kept · ${profile.passed} passed. ${profile.reviewed?'Use explicit reasons first and treat trends as tentative.':'No saved votes yet; start with the established editorial mix.'}`);
