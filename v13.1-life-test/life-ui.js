'use strict';
const momentCard=document.createElement('div');
momentCard.id='moment';momentCard.setAttribute('role','status');document.body.append(momentCard);
const soundButton=document.createElement('button');
soundButton.id='soundBtn';soundButton.type='button';soundButton.setAttribute('aria-label','開關環境聲');document.body.append(soundButton);
const buildTag=document.createElement('small');
buildTag.id='buildTag';buildTag.textContent='V13.1 · 午後生活測試';document.body.append(buildTag);
let audioContext=null,soundOn=true,momentTimer=0;
function tone(frequency,duration=.14,volume=.025,delay=0){
  if(!soundOn)return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+delay;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,start);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.02);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain).connect(audioContext.destination);oscillator.start(start);oscillator.stop(start+duration+.02);
  }catch(error){ console.warn('環境聲無法播放',error); }
}
function sound(kind){
  if(kind==='sit'){tone(392,.18,.018);tone(523,.24,.014,.1);}
  if(kind==='tea'){tone(659,.12,.02);tone(784,.2,.016,.11);tone(988,.28,.012,.23);}
  if(kind==='water'){tone(440,.12,.014);tone(554,.16,.012,.08);}
  if(kind==='memory'){tone(523,.2,.018);tone(659,.24,.015,.12);}
}
function setMoment(text,persistent=false){
  clearTimeout(momentTimer);momentCard.textContent=text;momentCard.classList.add('show');
  if(!persistent)momentTimer=setTimeout(()=>momentCard.classList.remove('show'),4200);
}
function setResting(resting){document.body.classList.toggle('resting',resting);if(!resting)momentCard.classList.remove('show');}
function updateSound(){soundButton.textContent=soundOn?'♫':'♩';soundButton.title=soundOn?'關閉環境聲':'開啟環境聲';soundButton.setAttribute('aria-pressed',String(soundOn));}
soundButton.onclick=()=>{soundOn=!soundOn;updateSound();setMoment(soundOn?'環境聲已開啟':'環境聲已關閉');if(soundOn)sound('sit');};
updateSound();
window.lifeUI={setMoment,setResting,sound,get soundOn(){return soundOn;}};
setTimeout(()=>setMoment('今天不用趕路。靠近沙發或河邊長椅，可以真的坐下來。'),900);
