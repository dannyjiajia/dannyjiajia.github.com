---
title: GCD与RunLoop
date: 2016-06-24 10:33:15
tags: [GCD,RunLoop]
---

最近发现iOS中的RunLoop和GCD被讨论的挺多的,我也写点复习下:)

~~~
#import <Foundation/Foundation.h>

int main()
{
    dispatch_queue_t globalQ = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
    
    /** 异步任务 **/
    dispatch_async(globalQ, ^{
        NSLog(@"async task");
    });
    
    /** 同步任务 **/
    dispatch_sync(globalQ, ^{
        NSLog(@"sync task");
    });
    NSLog(@"sync end");
    
    /** 一次性执行 **/
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        NSLog(@"once task");
    });
    
    /**  延迟 2 秒执行 **/
    double delayInSeconds = 2.0;
    dispatch_time_t popTime = dispatch_time(DISPATCH_TIME_NOW, delayInSeconds * NSEC_PER_SEC);
    dispatch_after(popTime, globalQ, ^(void){
        NSLog(@"delay task");
    });
    
    
    /** global queue是并行的 **/
    dispatch_async(globalQ, ^{
        NSLog(@"global_queue_task_1");
    });

    
    dispatch_async(globalQ, ^{
        NSLog(@"global_queue_task_2");
    });
    
    /** 自定义串行queue **/
    dispatch_queue_t customSerialQ = dispatch_queue_create("customSerialQ", DISPATCH_QUEUE_SERIAL);
    
    dispatch_async(customSerialQ, ^{
        NSLog(@"customSerialQ_task_1");
    });
    
    
    dispatch_async(customSerialQ, ^{
        NSLog(@"customSerialQ_task_2");
    });

    
    /** 自定义并行queue **/
    dispatch_queue_t customConcurrentQ = dispatch_queue_create("customConcurrentQ", DISPATCH_QUEUE_CONCURRENT);
    
    dispatch_async(customConcurrentQ, ^{
        NSLog(@"customConcurrentQ_task_1");
    });
    
    
    dispatch_async(customConcurrentQ, ^{
        NSLog(@"customConcurrentQ_task_2");
    });
    
    
    /** 并行任务归总 **/
    
    dispatch_group_t group = dispatch_group_create();
    dispatch_group_async(group, globalQ, ^{
        NSLog(@"并行执行的线程1");
    });
    dispatch_group_async(group, globalQ, ^{
        NSLog(@"并行执行的线程2");
    });
    dispatch_group_notify(group, globalQ, ^{
       NSLog(@"并行执行任务完成");
    });
    
    /** dispatch_source **/
    //1. timer
    
    dispatch_source_t gcd_timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0,globalQ);
    dispatch_source_set_timer(gcd_timer, DISPATCH_TIME_NOW, 5ull * NSEC_PER_SEC, 0); //5s
    dispatch_source_set_event_handler(gcd_timer, ^{
        NSLog(@"gcd timer task");
    });
    dispatch_resume(gcd_timer);

    //2. 自定义source任务
    dispatch_source_t gcd_source = dispatch_source_create(DISPATCH_SOURCE_TYPE_DATA_ADD, 0, 0,globalQ);
    dispatch_source_set_event_handler(gcd_source, ^{
        NSLog(@"gcd source task");
    });
    dispatch_resume(gcd_source);
    
    //2s后触发source任务
    dispatch_after(popTime, globalQ, ^(void){
        NSLog(@"fire gcd source task");
        dispatch_source_merge_data(gcd_source, 1);
    });
    
    /** 信号量 **/
    dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
    
    dispatch_async(globalQ, ^{
        NSLog(@"完成信号量任务");
        dispatch_semaphore_signal(semaphore);//增加信号量
    });
    //设置超时时间
    dispatch_time_t timeoutTime = dispatch_time(DISPATCH_TIME_NOW, 1ull*NSEC_PER_SEC);
    if (dispatch_semaphore_wait(semaphore, timeoutTime)) {
        NSLog(@"信号量任务超时");
    }
    dispatch_main(); //执行提交到main queue中的blocks,在iOS和Mac的桌面应用你不需要调用
}
~~~