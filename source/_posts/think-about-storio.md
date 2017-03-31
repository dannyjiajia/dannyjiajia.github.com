---
title: 介绍下StorIOSQLite到RxJava
date: 2017-03-31 09:46:40
tags: [Android,RxJava]
---

## storio?

`storio`是github上的[开源项目](https://github.com/pushtorefresh/storio),它用来操作`SQLiteDatabase`和 `ContentResolver`的操作进行封装,提供更简单更强大的api.我们项目最近从`xutils3`转换为`StorIOSQLite`,说说对它的体验和它是如何使用`RxJava`进行封装.

### storio是通过预先代码生成进行实体类的赋值

通过`SQLiteTypeMapping`提供实体的三种`Resolver`: 
1. PutResolver 
2. GetResolver
3. DeleteResolver

也就是分别对应我们在进行API操作时

1. 将实体转换为数据库数据(InsertQuery,UpdateQuery...)
2. 将数据库数据(Cursor)装换成实体对象
3. 如何执行删除操作

常规的`Resolver`只要我在实体类中使用它的`Annotation Processor`便会自动生成。

> 什么时候需要自定义呢?

复杂实体对象的时候(连表查询),因为` storio`是不关心具体实体类的,它只关心如何将实体和数据库操作建立起关系
比如文档中的[UserWithTweetsGetResolver.java](https://github.com/pushtorefresh/storio/blob/master/storio-sample-app/src/main/java/com/pushtorefresh/storio/sample/db/resolvers/UserWithTweetsGetResolver.java)
<!-- more -->
> 借鉴xutils利用`HashMap`来定义通用的读取实体

{% codeblock DbModel.java lang:java %}
import android.text.TextUtils;

import java.util.Date;
import java.util.HashMap;

public final class DbModel {

    /**
     * key: columnName
     * value: valueStr
     */
    private HashMap<String, String> dataMap = new HashMap<String, String>();

    public String getString(String columnName) {
        return dataMap.get(columnName);
    }

    public int getInt(String columnName) {
        return Integer.valueOf(dataMap.get(columnName));
    }

    public boolean getBoolean(String columnName) {
        String value = dataMap.get(columnName);
        if (value != null) {
            return value.length() == 1 ? "1".equals(value) : Boolean.valueOf(value);
        }
        return false;
    }

    public double getDouble(String columnName) {
        return Double.valueOf(dataMap.get(columnName));
    }

    public float getFloat(String columnName) {
        return Float.valueOf(dataMap.get(columnName));
    }

    public long getLong(String columnName) {
        return Long.valueOf(dataMap.get(columnName));
    }

    public Date getDate(String columnName) {
        long date = Long.valueOf(dataMap.get(columnName));
        return new Date(date);
    }

    public java.sql.Date getSqlDate(String columnName) {
        long date = Long.valueOf(dataMap.get(columnName));
        return new java.sql.Date(date);
    }

    public void add(String columnName, String valueStr) {
        dataMap.put(columnName, valueStr);
    }

    /**
     * @return key: columnName
     */
    public HashMap<String, String> getDataMap() {
        return dataMap;
    }

    /**
     * @param columnName
     * @return
     */
    public boolean isEmpty(String columnName) {
        return TextUtils.isEmpty(dataMap.get(columnName));
    }
}
{% endcodeblock %}

> 提供SQLiteTypeMapping,只提供get操作


{% codeblock DbModelSQLiteTypeMapping.java lang:java %}
import android.database.Cursor;
import android.support.annotation.NonNull;

import com.pushtorefresh.storio.sqlite.SQLiteTypeMapping;
import com.pushtorefresh.storio.sqlite.StorIOSQLite;
import com.pushtorefresh.storio.sqlite.operations.delete.DeleteResolver;
import com.pushtorefresh.storio.sqlite.operations.delete.DeleteResult;
import com.pushtorefresh.storio.sqlite.operations.get.DefaultGetResolver;
import com.pushtorefresh.storio.sqlite.operations.put.PutResolver;
import com.pushtorefresh.storio.sqlite.operations.put.PutResult;

/**
 * Created by dannyhe on 14/01/2017.
 */

public class DbModelSQLiteTypeMapping extends SQLiteTypeMapping<DbModel> {

	public static class DBModelPutResolver extends PutResolver<DbModel> {

		@NonNull
		@Override
		public PutResult performPut(@NonNull StorIOSQLite storIOSQLite, @NonNull DbModel object) {
			return PutResult.newUpdateResult(0,"");
		}
	}

	public static class DBModelGetResolver extends DefaultGetResolver<DbModel> {

		@NonNull
		@Override
		public DbModel mapFromCursor(@NonNull Cursor cursor) {
			DbModel result = new DbModel();
			int columnCount = cursor.getColumnCount();
			for (int i = 0; i < columnCount; i++) {
				result.add(cursor.getColumnName(i), cursor.getString(i));
			}
			return result;
		}
	}

	public static class DBModelDeleteResolver extends DeleteResolver<DbModel> {
		@NonNull
		@Override
		public DeleteResult performDelete(@NonNull StorIOSQLite storIOSQLite, @NonNull DbModel object) {
			return DeleteResult.newInstance(0,"");
		}
	}


	public DbModelSQLiteTypeMapping() {
		super(new DBModelPutResolver(),
				new DBModelGetResolver(),
				new DBModelDeleteResolver());
	}

}
{% endcodeblock %}

> 如何使用

~~~
StorIOSQLite mStorIOSQLite =  DefaultStorIOSQLite.builder()
    .sqliteOpenHelper(dbOpenHelper)
    .defaultScheduler(defaultStorIOSQLiteScheduler()) //io thread
    .addTypeMapping(DbModel.class, new DbModelSQLiteTypeMapping())
    .build;

DbModel dbModel = mStorIOSQLite.get()
                .object(DbModel.class)
                .withQuery(RawQuery.builder()
                        .query("SELECT COUNT(*) AS c FROM sqlite_master WHERE type=? AND name=?")
                        .args("table", tableName)
                        .build())
                .prepare()
                .executeAsBlocking();
~~~

### Entity VS Cursor

`storio`提供了两种读取方式:

1. Entity 
~~~
DbModel dbModel = mStorIOSQLite.get()
                .object(DbModel.class)
                .withQuery(RawQuery.builder()
                        .query("SELECT COUNT(*) AS c FROM sqlite_master WHERE type=? AND name=?")
                        .args("table", tableName)
                        .build())
                .prepare()
                .executeAsBlocking();
~~~
2. Cursor
~~~
final Cursor dbModelCursor = mStorIOSQLite.get()
                .cursor()
                .withQuery(RawQuery.builder()
                        .query("SELECT COUNT(*) AS c FROM sqlite_master WHERE type=? AND name=?")
                        .args("table", tableName)
                        .build())
                .prepare()
                .executeAsBlocking();
...
~~~

### RxJava VS executeAsBlocking

#### 理解
关于`RxJava`的应用(`asRxObservable()`),目前数据库框架基本上都是利用`PublishSubject`.每个`StorIOSQLite`内部有个`RxChangesBus`,所有的`asRxObservable()`方法都是订阅这个bus.
订阅时会对Bus的事件过滤,只留下这次查询需要的变化(通过数据表的名称过滤)生成Observable.并通过`startWith`插入一次查询的结果,用来解决订阅时没有事件源触发查询操作的问题.

我们来分析下面的查询`StorIOSQLite`到底做了什么,下面的查询来自官网的文档:
我们先按着链式阅读来理解这个方法

~~~
mStorIOSQLite
  .get()
  .listOfObjects(Tweet.class)
  .withQuery(Query.builder()
    .table("tweets")
    .build())
  .prepare()
  .asRxObservable() // Get Result as rx.Observable and subscribe to further updates of tables from Query!
  .observeOn(mainThread()) // All Rx operations work on Schedulers.io()
  .subscribe(tweets -> { // Please don't forget to unsubscribe
      // will be called with first result and then after each change of tables from Query
      // several changes in transaction -> one notification
      adapter.setData(tweets);
    }
  );
// don't forget to manage Subscription and unsubscribe in lifecycle methods to prevent memory leaks
~~~

> 我们拿到数据库(storIOSQLite)读取(get)存有Tweet的列表(listOfObjects(Tweet.class))通过查询(Query)数据库表"tweets".我们需要得到Observable(asRxObservable())然后在主线程订阅(observeOn(mainThread())),最后将数据给adapter.并且后面每次tweets表发生变化都会触发这次刷新(除非取消订阅,当然为了不引发内存泄露,我们需要在合理的时候取消订阅).

#### 下面我们再来看`StorIOSQLite`做了什么?

1. 首先通过`Query`来获取需要查询的表,我们这里是`tweets`
2. 通过内部的`RxChangesBus`订阅变化(`Changes`),并通过`filter`操作符过滤出存在`tweets`表的变化
3. 查询一次`Query`并通过`startWith`操作符插入查询结果(会通过listOfObjects进行实体转换)

注意:一定要及时取消订阅,以免引起内存泄露

#### 多张表的监听

比如有这样的业务需求,我需要查询多张表以完成这次查询,但是一条SQL语句又不能实现.

~~~
fetchDatasThenRefreshUI();//读取数据并刷新UI,这里会读取table1和table2
mStorIOSQLite
    .observeChangesInTables(Sets.newHashSet("table1","table2"))
    .subscribe(changes -> {
         fetchDatasThenRefreshUI(); //如果有变化再次读取数据库
    });
~~~

> 上面的写法是不是很繁琐,我们重构一下...

~~~
mStorIOSQLite
    .observeChangesInTables(Sets.newHashSet("table1","table2"))
    .startWith(Changes.newInstance(""))
    .compose(this.<Changes>bindUntilEvent(FragmentEvent.DESTROY)) //使用RxLifecycle自动取消订阅
    .subscribe(changes -> {
         fetchDatasThenRefreshUI(); //读取数据并刷新UI,这里会读取table1和table2
    });
~~~

#### 主动通知变化

`StorIOSQLite`默认的通知变化是只要对一张表有数据操作时(CURD)均会发生通知,如果我们有个业务需求是需要给一个表里面插入1000条数据,插入成功后再刷新界面。
这个时候我们就需要`LowLevel`

~~~
List<String> strings = ...; //存放了操作两个数据库表的sql语句
try {    
    mStorIOSQLite.lowLevel().beginTransaction(); //事务
    for (String sql : strings) { 
        mStorIOSQLite.lowLevel()
            .executeSQL(RawQuery.builder().query(sql).build()); 
    }
    mStorIOSQLite.lowLevel()
        .setTransactionSuccessful();
    //通知table1和table2发生了变化(触发再次读取事件)
    mStorIOSQLite.lowLevel()
        .notifyAboutChanges(Changes.newInstance(Sets.newHashSet("table1","table2"))); 
    } finally {
        mStorIOSQLite.lowLevel().endTransaction();
    }
~~~